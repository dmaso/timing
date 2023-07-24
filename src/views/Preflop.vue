<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { supabase } from '@/lib/supabaseClient'

const preflopChart = [
  'AA',
  'AKs',
  'AQs',
  'AJs',
  'ATs',
  'A9s',
  'A8s',
  'A7s',
  'A6s',
  'A5s',
  'A4s',
  'A3s',
  'A2s',
  'AKo',
  'KK',
  'KQs',
  'KJs',
  'KTs',
  'K9s',
  'K8s',
  'K7s',
  'K6s',
  'K5s',
  'K4s',
  'K3s',
  'K2s',
  'AQo',
  'KQo',
  'QQ',
  'QJs',
  'QTs',
  'Q9s',
  'Q8s',
  'Q7s',
  'Q6s',
  'Q5s',
  'Q4s',
  'Q3s',
  'Q2s',
  'AJo',
  'KJo',
  'QJo',
  'JJ',
  'JTs',
  'J9s',
  'J8s',
  'J7s',
  'J6s',
  'J5s',
  'J4s',
  'J3s',
  'J2s',
  'ATo',
  'KTo',
  'QTo',
  'JTo',
  'TT',
  'T9s',
  'T8s',
  'T7s',
  'T6s',
  'T5s',
  'T4s',
  'T3s',
  'T2s',
  'A9o',
  'K9o',
  'Q9o',
  'J9o',
  'T9o',
  '99',
  '98s',
  '97s',
  '96s',
  '95s',
  '94s',
  '93s',
  '92s',
  'A8o',
  'K8o',
  'Q8o',
  'J8o',
  'T8o',
  '98o',
  '88',
  '87s',
  '86s',
  '85s',
  '84s',
  '83s',
  '82s',
  'A7o',
  'K7o',
  'Q7o',
  'J7o',
  'T7o',
  '97o',
  '87o',
  '77',
  '76s',
  '75s',
  '74s',
  '73s',
  '72s',
  'A6o',
  'K6o',
  'Q6o',
  'J6o',
  'T6o',
  '96o',
  '86o',
  '76o',
  '66',
  '65s',
  '64s',
  '63s',
  '62s',
  'A5o',
  'K5o',
  'Q5o',
  'J5o',
  'T5o',
  '95o',
  '85o',
  '75o',
  '65o',
  '55',
  '54s',
  '53s',
  '52s',
  'A4o',
  'K4o',
  'Q4o',
  'J4o',
  'T4o',
  '94o',
  '84o',
  '74o',
  '64o',
  '54o',
  '44',
  '43s',
  '42s',
  'A3o',
  'K3o',
  'Q3o',
  'J3o',
  'T3o',
  '93o',
  '83o',
  '73o',
  '63o',
  '53o',
  '43o',
  '33',
  '32s',
  'A2o',
  'K2o',
  'Q2o',
  'J2o',
  'T2o',
  '92o',
  '82o',
  '72o',
  '62o',
  '52o',
  '42o',
  '32o',
  '22'
]

const hands = ref([])
const rangeWithTimings = ref([])
const filteredRange = computed(() => {
  const min = parseFloat(minTiming.value)
  const max = parseFloat(maxTiming.value)

  return rangeWithTimings.value.filter((item) => {
    const timing = parseFloat(item.split(',')[1])
    return timing >= min && timing <= max
  })
})

const callThreebetCount = ref(0)
const foldToThreebetCount = ref(0)
const fourbetCount = ref(0)

const calculateThreebetCounts = () => {
  const rcHands = hands.value.filter(
    (hand) =>
      hand.utg.preflopSequence === 'RC' &&
      parseFloat(hand.utg.preflopAction[1]) >= parseFloat(minTiming.value) &&
      parseFloat(hand.utg.preflopAction[1]) <= parseFloat(maxTiming.value)
  )

  const rfHands = hands.value.filter(
    (hand) =>
      hand.utg.preflopSequence === 'RF' &&
      parseFloat(hand.utg.preflopAction[1]) >= parseFloat(minTiming.value) &&
      parseFloat(hand.utg.preflopAction[1]) <= parseFloat(maxTiming.value)
  )

  const rrHands = hands.value.filter(
    (hand) =>
      hand.utg.preflopSequence === 'RR' &&
      parseFloat(hand.utg.preflopAction[1]) >= parseFloat(minTiming.value) &&
      parseFloat(hand.utg.preflopAction[1]) <= parseFloat(maxTiming.value)
  )

  const totalThreebetHands = rcHands.length + rfHands.length + rrHands.length

  const rcPercentage = (rcHands.length / totalThreebetHands) * 100
  const rfPercentage = (rfHands.length / totalThreebetHands) * 100
  const rrPercentage = (rrHands.length / totalThreebetHands) * 100

  callThreebetCount.value = rcPercentage.toFixed(2) + '%'
  foldToThreebetCount.value = rfPercentage.toFixed(2) + '%'
  fourbetCount.value = rrPercentage.toFixed(2) + '%'
}

const totalOccurrences = computed(() => {
  return Object.values(occurrences.value).reduce((total, count) => total + count, 0)
})

const minTiming = ref('10')
const maxTiming = ref('100')

const rowCount = ref(0)

const fetchAllRows = async () => {
  let allData = []
  let lastId = 0
  let fetchMore = true

  while (fetchMore) {
    const { data, error } = await supabase
      .from('hands')
      .select('utg, id, preflopcode') // Including 'preflopcode' in the selection
      .filter('preflopcode', 'ilike', '%UTGR%') // Modified filter to use 'ilike' for case-insensitive search
      .order('id', { ascending: true })
      .limit(1000)
      .gt('id', lastId) // Fetch rows where 'id' is greater than the last fetched 'id'

    if (error) {
      console.error('Error fetching data:', error)
      break
    }

    allData = [...allData, ...data]
    fetchMore = data.length === 1000

    if (data.length > 0) {
      lastId = data[data.length - 1].id // Get the 'id' of the last row for the next iteration
    }
  }

  // Apply the filtering here to ensure we have all the rows before filtering out any data
  allData = allData.filter((row) => row.utg && row.utg.handChart && row.utg.preflopAction)

  hands.value = allData

  // Extract 'hand' and second value of 'preflopAction' from each row
  rangeWithTimings.value = allData.map((row) => {
    const hand = row.utg.handChart
    const timing = row.utg.preflopAction[1]
    return `${hand}, ${timing}`
  })

  console.log('Fetched hands:', hands.value)
  console.log('Range with Timings:', rangeWithTimings.value)
  console.log('occurrences:', occurrences.value)
}

const occurrences = computed(() => {
  const occurrenceMap = {}

  for (let item of filteredRange.value) {
    const [hand, _] = item.split(',')
    if (hand) {
      // Ensure hand exists before counting
      occurrenceMap[hand] = (occurrenceMap[hand] || 0) + 1
    }
  }

  console.log('Populated occurrences:', occurrenceMap) // Log the populated map

  return occurrenceMap
})

const getColorForCount = (count, maxCount) => {
  const range = maxCount / 8

  if (count === 0) return 'bg-gray-200'

  if (count <= range) return 'bg-green-50'
  if (count <= 2 * range) return 'bg-green-100'
  if (count <= 3 * range) return 'bg-green-200'
  if (count <= 4 * range) return 'bg-green-300'
  if (count <= 5 * range) return 'bg-green-400'
  if (count <= 6 * range) return 'bg-green-500'
  if (count <= 7 * range) return 'bg-green-600'

  return 'bg-green-700' // Anything greater falls into the last bucket
}

const getClassByOccurrence = computed(() => {
  // Get the current state of occurrences
  const currentOccurrences = occurrences.value

  // Calculate the maximum count from the occurrences
  const maxCount = Math.max(...Object.values(currentOccurrences))

  // Return a function that checks the count of a given handClass
  return (handClass) => {
    const count = currentOccurrences[handClass] || 0 // Default to 0 if the handClass doesn't exist
    return getColorForCount(count, maxCount)
  }
})

onMounted(() => {
  fetchAllRows()
  watch([minTiming, maxTiming], calculateThreebetCounts)
})
</script>
<template>
  <div class="bg-slate-200 h-full py-20 h-screen">
    <div
      class="container max-w-screen-xl mx-auto rounded-md border border-slate-300 bg-white p-10 t-20"
    >
      <div class="flex flex-col">
        <div>
          <div class="flex mb-4">
            <input
              v-model="minTiming"
              type="number"
              min="0"
              class="border border-gray-300 rounded-md px-4 py-2 mr-2"
              placeholder="Min Timing"
            />
            <input
              v-model="maxTiming"
              type="number"
              min="0"
              class="border border-gray-300 rounded-md px-4 py-2"
              placeholder="Max Timing"
            />
          </div>
        </div>
        <div>
          <div class="grid grid-cols-13">
            <div
              v-for="(handClass, index) in preflopChart"
              :key="index"
              class="border border-gray-200 rounded shadow-sm px-2 py-2 text-center text-white text-sm"
              :class="getClassByOccurrence(handClass)"
            >
              {{ handClass }}
            </div>
          </div>
        </div>
        <div>
          <div class="mt-4">
            <span class="">Total Occurrences:</span>
            <span class="font-bold">{{ totalOccurrences }}</span>
          </div>
        </div>
        <div>
          <div class="mt-4">
            <span class="">Call Threebet:</span>
            <span class="font-bold">{{ callThreebetCount }}</span>
          </div>
        </div>
        <div>
          <div class="mt-4">
            <span class="">Fold to Threebet:</span>
            <span class="font-bold">{{ foldToThreebetCount }}</span>
          </div>
        </div>
        <div>
          <div class="mt-4">
            <span class="">Fourbet:</span>
            <span class="font-bold">{{ fourbetCount }}</span>
          </div>
        </div>
      </div>
      <!-- Add text boxes for minTiming and maxTiming -->
    </div>
  </div>
</template>
