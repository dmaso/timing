<script setup>
import { ref, onMounted } from 'vue'
import { supabase } from '@/lib/supabaseClient'

const input = ref('')
const inputHands = ref([])
const hands = ref({})
const analyzedCount = ref(0)

function orderHand(hand) {
  const order = 'AKQJT98765432'
  const cards = hand.split(' ')

  cards.sort((a, b) => {
    // If the ranks of the cards are the same, sort by the suit.
    if (a[0] === b[0]) {
      return a[1].localeCompare(b[1])
    }
    return order.indexOf(a[0]) - order.indexOf(b[0])
  })

  return cards.join('') // Remove spaces
}

function generateHandChart(orderedHand) {
  const value1 = orderedHand[0]
  const suit1 = orderedHand[1]
  const value2 = orderedHand[2]
  const suit2 = orderedHand[3]

  // Check for pair
  if (value1 === value2) {
    return `${value1}${value2}`
  }
  // Check for same suit
  else if (suit1 === suit2) {
    return `${value1}${value2}s`
  }
  // Different suits
  else {
    return `${value1}${value2}o`
  }
}

function splitHands() {
  // Split the input by the string and remove the first item since it's before the first hand
  const rawHands = input.value.split('PokerStars Hand').slice(1)

  // Prepend "PokerStars Hand" back to each split hand
  return rawHands.map((hand) => 'PokerStars Hand' + hand)
}

function handleFileChange(event) {
  const file = event.target.files[0]

  if (file) {
    const reader = new FileReader()

    reader.onload = function (e) {
      let text = e.target.result

      // Step 1: Remove all instances of " [ME]"
      text = text.replace(/ \[ME\]/g, '')

      // Step 2: Convert terminologies
      text = text.replace(/Small Blind/g, 'SB')
      text = text.replace(/Big Blind/g, 'BB')
      text = text.replace(/Dealer/g, 'BTN')

      // Step 3: Adjust seat names based on presence
      const seatsPresent = text.match(/Seat (\d)/g).map((seat) => Number(seat.split(' ')[1]))

      if (seatsPresent.includes(1) && seatsPresent.includes(6)) {
        text = text.replace(/UTGplus2/g, 'CO')
        text = text.replace(/UTGplus1/g, 'HJ')
      } else if (!seatsPresent.includes(1) && seatsPresent.includes(6)) {
        text = text.replace(/UTGplus1/g, 'CO')
      }

      input.value = text
      inputHands.value = splitHands() // Save the separated hands to the hands ref
    }

    reader.readAsText(file)
  }
}

function extractID(hand) {
  const idMatch = hand.match(/PokerStars Hand #(\d+):/)
  return idMatch ? idMatch[1] : null
}

function extractDate(hand) {
  const dateMatch = hand.match(/\- (\d{4}\/\d{2}\/\d{2} \d{2}:\d{2}:\d{2})/)
  return dateMatch ? dateMatch[1] : null
}

function extractPlayerHands(hand) {
  // Pattern for "Dealt to POSITION [CARD1 CARD2]"
  const dealtHandPattern = /Dealt to (\w+) \[(\w\w) (\w\w)\]/
  const matchDealtHand = hand.match(dealtHandPattern)

  // Initialize the hands object with the dealt cards
  const playerHands = {}
  if (matchDealtHand) {
    const position = matchDealtHand[1]
    const orderedHand = orderHand(matchDealtHand[2] + ' ' + matchDealtHand[3])
    playerHands[position] = orderedHand
  }

  // Pattern for "POSITION: shows [CARD1 CARD2]"
  const showsPattern = /(\w+): shows \[(\w\w) (\w\w)\]/g
  let matchShows
  while ((matchShows = showsPattern.exec(hand)) !== null) {
    const position = matchShows[1]
    const orderedHand = orderHand(matchShows[2] + ' ' + matchShows[3])
    playerHands[position] = orderedHand
  }

  return playerHands
}

function extractBlinds(hand) {
  const blindsMatch = hand.match(/Hold'em No Limit \((\$?\d+(\.\d+)?\/\$?\d+(\.\d+)?)\)/)
  if (blindsMatch) {
    const blinds = blindsMatch[1].split('/')
    return {
      smallBlind: parseFloat(blinds[0].replace('$', '')), // Convert the string to a float (removing the dollar sign)
      bigBlind: parseFloat(blinds[1].replace('$', ''))
    }
  }
  return null
}

function extractStackSize(hand, bigBlind) {
  const stackSizePattern = /Seat \d+: (\w+) \(\$(\d+(\.\d{2})?) in chips\)/g
  const playerStackSizes = {}

  let match
  while ((match = stackSizePattern.exec(hand)) !== null) {
    const position = match[1]
    const stackSizeValue = parseFloat(match[2])
    const normalizedStackSize = Math.round(stackSizeValue / bigBlind) // Divide by big blind and round to nearest integer
    playerStackSizes[position] = normalizedStackSize
  }

  return playerStackSizes
}

function extractActionSection(handText, startDelimiter, endDelimiter) {
  let section

  if (handText.includes(startDelimiter) && handText.includes(endDelimiter)) {
    section = handText.split(startDelimiter)[1].split(endDelimiter)[0]
  } else if (handText.includes(startDelimiter)) {
    section = handText.split(startDelimiter)[1]
  } else {
    return '' // Return empty string if startDelimiter isn't even found.
  }

  return section
}

function extractActions(handText, startDelimiter, endDelimiter) {
  const actions = {
    UTG: { action: [] },
    HJ: { action: [] },
    CO: { action: [] },
    BTN: { action: [] },
    SB: { action: [] },
    BB: { action: [] }
  }

  const actionSection = extractActionSection(handText, startDelimiter, endDelimiter)
  const actionLines = actionSection.trim().split('\n')

  actionLines.forEach((line) => {
    const positionMatch = line.match(/(UTG|HJ|CO|BTN|SB|BB): (\w+)/)
    const valueMatch = line.match(/{(\d+)}/)

    if (positionMatch) {
      const position = positionMatch[1]
      const action = positionMatch[2]

      let actionSymbol
      switch (action) {
        case 'raises':
          actionSymbol = 'R'
          break
        case 'calls':
          actionSymbol = 'C'
          break
        case 'folds':
          actionSymbol = 'F'
          break
        case 'checks':
          actionSymbol = 'X'
          break
        case 'bets': // Added this line for 'bets' action
          actionSymbol = 'B'
          break
      }

      if (actionSymbol) {
        actions[position].action.push(actionSymbol)
        if (valueMatch && valueMatch[1]) {
          actions[position].action.push(valueMatch[1])
        }
      }
    }
  })

  // Ensure all positions have the "action" key
  for (const position of ['UTG', 'HJ', 'CO', 'BTN', 'SB', 'BB']) {
    if (!actions[position].action) {
      actions[position].action = []
    }
  }

  return actions
}

function extractBoard(hand) {
  const board = {
    flop: '',
    turn: '',
    river: ''
  }

  // Extract Flop
  const flopMatch = hand.match(/\*\*\* FLOP \*\*\* \[(\w\w) (\w\w) (\w\w)\]/)
  if (flopMatch) {
    board.flop = flopMatch[1] + flopMatch[2] + flopMatch[3]
  }

  // Extract Turn
  const turnMatch = hand.match(/\*\*\* TURN \*\*\* \[\w\w \w\w \w\w\] \[(\w\w)\]/)
  if (turnMatch) {
    board.turn = turnMatch[1]
  }

  // Extract River
  const riverMatch = hand.match(/\*\*\* RIVER \*\*\* \[\w\w \w\w \w\w \w\w\] \[(\w\w)\]/)
  if (riverMatch) {
    board.river = riverMatch[1]
  }

  return board
}

function generatePreflopCode(preflopActions) {
  const positions = ['UTG', 'HJ', 'CO', 'BTN', 'SB', 'BB']
  let preflopCode = ''
  let anyActionFound

  do {
    anyActionFound = false // Reset the flag

    for (const position of positions) {
      const actions = preflopActions[position]?.action || []

      // We're only interested in the even indexes
      if (actions.length > 0 && actions[0] && isNaN(actions[0])) {
        preflopCode += position + actions.shift() + '-'
        actions.shift() // Skip the next item which is a number
        anyActionFound = true // If we've found an action, set the flag
      }
    }
  } while (anyActionFound) // If any position had an action on the last loop, go again

  // Remove the trailing '-'
  if (preflopCode.endsWith('-')) {
    preflopCode = preflopCode.slice(0, -1)
  }

  return preflopCode
}

function analyze() {
  let countUTGR = 0 // Initialize the counter for hands with "UTGR" in preflopCode
  let handsWithUTGRWithoutUTG = [] // Initialize an array to store hands with UTGR in preflopCode but no 'UTG'

  inputHands.value.forEach((hand) => {
    const id = extractID(hand)
    const date = extractDate(hand)

    if (id && date) {
      const blinds = extractBlinds(hand)
      if (!blinds) {
        console.warn(`Missing blinds information for hand ID: ${id}`)
        return
      }

      const boardInfo = extractBoard(hand)

      hands.value[id] = {
        details: {
          date: date,
          smallBlind: blinds.smallBlind,
          bigBlind: blinds.bigBlind
        },
        board: boardInfo,
        originalhand: hand.replace(/\r\n/g, '\n')
      }

      const playerHands = extractPlayerHands(hand)
      const playerStackSizes = extractStackSize(hand, blinds.bigBlind)

      // Check if 'UTG' entry exists in playerHands
      if (!playerHands.UTG) {
        // 'UTG' entry is missing, check if 'UTGR' is present in preflopCode
        const preflopActions = extractActions(hand, '*** HOLE CARDS ***', '*** FLOP ***')
        const clonedPreflopActions = JSON.parse(JSON.stringify(preflopActions))
        const preflopCode = generatePreflopCode(clonedPreflopActions)
        if (preflopCode.includes('UTGR')) {
          countUTGR++
          handsWithUTGRWithoutUTG.push(id)
        }
        return // Skip the rest of the processing for this hand
      }

      // 'UTG' entry exists, continue with the rest of the processing

      // Extract actions
      const preflopActions = extractActions(hand, '*** HOLE CARDS ***', '*** FLOP ***')

      // Clone the preflopActions and use the generatePreflopCode function
      const clonedPreflopActions = JSON.parse(JSON.stringify(preflopActions))
      const preflopCode = generatePreflopCode(clonedPreflopActions)
      hands.value[id].preflopCode = preflopCode

      if (preflopCode.includes('UTGR')) {
        countUTGR++
      }

      const flopActions = extractActions(hand, '*** FLOP ***', '*** TURN ***')
      const turnActions = extractActions(hand, '*** TURN ***', '*** RIVER ***')
      const riverActions = extractActions(hand, '*** RIVER ***', '*** SUMMARY ***')

      for (const position in playerHands) {
        const preflopSequence = generateSequence(preflopActions[position].action || [])
        const flopSequence = generateSequence(flopActions[position].action || [])
        const turnSequence = generateSequence(turnActions[position].action || [])
        const riverSequence = generateSequence(riverActions[position].action || [])

        hands.value[id][position] = {
          hand: playerHands[position],
          handChart: generateHandChart(playerHands[position]),
          stackSize: playerStackSizes[position] || '',
          preflopAction: preflopActions[position].action || [],
          flopAction: flopActions[position].action || [],
          turnAction: turnActions[position].action || [],
          riverAction: riverActions[position].action || [],
          preflopSequence,
          flopSequence,
          turnSequence,
          riverSequence
        }
      }
    }
  })

  console.log(hands.value)
  console.log('Hand with ID 4491987815:', hands.value['4491987815'])
  console.log(`Number of hands with 'UTGR' in preflopCode: ${countUTGR}`)
  console.log("Hands with UTGR in preflopCode but no 'UTG':", handsWithUTGRWithoutUTG)

  analyzedCount.value = inputHands.value.length
}

function generateSequence(action) {
  return action.filter((item) => isNaN(item)).join('')
}

async function saveToDatabase() {
  console.log('Starting saveToDatabase function...')

  if (inputHands.value.length > 0) {
    const handsToSave = []

    for (const handId in hands.value) {
      const currentHand = hands.value[handId]

      const dbHand = {
        hand_id: handId,
        date: currentHand.details.date,
        smallblind: currentHand.details.smallBlind,
        bigblind: currentHand.details.bigBlind,
        flop: currentHand.board.flop,
        turn: currentHand.board.turn,
        river: currentHand.board.river,
        utg: currentHand.UTG,
        hj: currentHand.HJ,
        co: currentHand.CO,
        btn: currentHand.BTN,
        sb: currentHand.SB,
        bb: currentHand.BB,
        preflopcode: currentHand.preflopCode, // Including the preflopCode
        originalhand: currentHand.originalhand // Adding the originalhand field to be saved to database
      }
      handsToSave.push(dbHand)
    }

    // Save all the prepared hands to the database
    if (handsToSave.length > 0) {
      console.log('Inserting new hands into the database...')
      const { data, error } = await supabase
        .from('hands')
        .upsert(handsToSave, { onConflict: 'hand_id' }) // Use upsert with onConflict

      if (error) {
        console.error('Error saving to database:', error)
      } else {
        console.log('Successfully saved or updated in the database:', data)
      }
    } else {
      console.log('No new hands to save.')
    }
  } else {
    console.warn('No hands to save.')
  }
}
</script>
<template>
  <div class="bg-slate-200 h-full py-20 h-screen">
    <div
      class="container max-w-screen-xl mx-auto rounded-md border border-slate-300 bg-white p-10 t-20"
    >
      <div>
        <input type="file" accept="text/plain" @change="handleFileChange" />
      </div>
      <div>
        <button
          class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mt-5"
          @click="analyze"
        >
          Analyze Hands
        </button>
      </div>
      <div class="mt-5">
        <span>Analyzed {{ analyzedCount }} hands.</span>
      </div>
      <div>
        <button
          class="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded mt-5"
          @click="saveToDatabase"
        >
          Save to Database
        </button>
      </div>
    </div>
  </div>
</template>
