// src/components/MonthlyReportScreen.jsx
import { useState, useEffect } from 'react'
import { Box, Button, Heading, Select, SimpleGrid, Stat, StatLabel, StatNumber, StatHelpText, Table, Thead, Tbody, Tr, Th, Td, VStack, Text, Spinner } from '@chakra-ui/react'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '../firebase'

export default function MonthlyReportScreen({ onBack }) {
  const [loading, setLoading] = useState(false)
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth()) // 0 = Jan, 11 = Dec
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  
  const [report, setReport] = useState({
    sales: 0,
    expenses: 0,
    wastage: 0,
    netProfit: 0,
    transactionCount: 0
  })

  // Generate Year Options (2024 - 2030)
  const years = Array.from({length: 6}, (_, i) => 2024 + i)
  
  const months = [
    "January", "February", "March", "April", "May", "June", 
    "July", "August", "September", "October", "November", "December"
  ]

  const generateReport = async () => {
    setLoading(true)
    try {
      // Define Start and End Date for the selected month
      const start = new Date(selectedYear, selectedMonth, 1)
      const end = new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59) // Last second of the month

      let totalSales = 0
      let totalTx = 0
      let totalExpenses = 0
      let totalWastage = 0

      // 1. Fetch Sales
      const salesSnap = await getDocs(collection(db, "sales"))
      salesSnap.forEach(doc => {
        const data = doc.data()
        const date = data.createdAt?.toDate()
        if (date >= start && date <= end) {
          totalSales += data.totalAmount || 0
          totalTx++
        }
      })

      // 2. Fetch Expenses
      const expSnap = await getDocs(collection(db, "expenses"))
      expSnap.forEach(doc => {
        const data = doc.data()
        const date = data.date?.toDate() // Assuming expenses have a 'date' timestamp
        if (date >= start && date <= end) {
          totalExpenses += data.amount || 0
        }
      })

      // 3. Fetch Wastage
      const wasteSnap = await getDocs(collection(db, "wastage"))
      wasteSnap.forEach(doc => {
        const data = doc.data()
        const date = data.reportedAt?.toDate()
        if (date >= start && date <= end) {
          // Assuming you saved 'lossValue' in wastage. If not, estimate.
          totalWastage += data.lossValue || 0 
        }
      })

      setReport({
        sales: totalSales,
        expenses: totalExpenses,
        wastage: totalWastage,
        netProfit: totalSales - totalExpenses - totalWastage,
        transactionCount: totalTx
      })

    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  // Run report when selection changes
  useEffect(() => {
    generateReport()
  }, [selectedMonth, selectedYear])

  return (
    <Box p={4} maxW="1000px" mx="auto">
      <Button onClick={onBack} mb={6}>← Back to Dashboard</Button>
      
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={6}>
        <Heading size="lg" color="teal.700">Monthly Archives 📂</Heading>
        
        <Box display="flex" gap={2}>
          <Select w="150px" value={selectedMonth} onChange={(e) => setSelectedMonth(parseInt(e.target.value))}>
            {months.map((m, i) => <option key={i} value={i}>{m}</option>)}
          </Select>
          <Select w="100px" value={selectedYear} onChange={(e) => setSelectedYear(parseInt(e.target.value))}>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </Select>
        </Box>
      </Box>

      {loading ? (
        <Box textAlign="center" py={10}><Spinner size="xl" /></Box>
      ) : (
        <>
          <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={6} mb={8}>
            <StatCard label="Total Revenue" value={report.sales} color="green" />
            <StatCard label="Expenses" value={report.expenses} color="red" />
            <StatCard label="Wastage Loss" value={report.wastage} color="orange" />
            <StatCard 
              label="Net Profit" 
              value={report.netProfit} 
              color={report.netProfit >= 0 ? "teal" : "red"} 
              isBold 
            />
          </SimpleGrid>

          <Box bg="white" p={6} borderRadius="xl" shadow="sm">
            <Heading size="sm" mb={4}>Summary for {months[selectedMonth]} {selectedYear}</Heading>
            <Table variant="simple">
              <Tbody>
                <Tr>
                  <Td>Transactions Processed</Td>
                  <Td fontWeight="bold">{report.transactionCount}</Td>
                </Tr>
                <Tr>
                  <Td>Gross Revenue</Td>
                  <Td fontWeight="bold">TZS {report.sales.toLocaleString()}</Td>
                </Tr>
                <Tr>
                  <Td color="red.500">Less: Operational Expenses</Td>
                  <Td color="red.500">- TZS {report.expenses.toLocaleString()}</Td>
                </Tr>
                <Tr>
                  <Td color="orange.500">Less: Wastage & Breakage</Td>
                  <Td color="orange.500">- TZS {report.wastage.toLocaleString()}</Td>
                </Tr>
                <Tr bg="gray.50">
                  <Td fontWeight="800" fontSize="lg">NET PROFIT</Td>
                  <Td fontWeight="800" fontSize="lg" color={report.netProfit >= 0 ? "green.600" : "red.600"}>
                    TZS {report.netProfit.toLocaleString()}
                  </Td>
                </Tr>
              </Tbody>
            </Table>
          </Box>
        </>
      )}
    </Box>
  )
}

function StatCard({ label, value, color, isBold }) {
  return (
    <Box p={5} bg="white" shadow="md" borderRadius="xl" borderTop="4px solid" borderColor={`${color}.400`}>
      <Stat>
        <StatLabel color="gray.500">{label}</StatLabel>
        <StatNumber color={`${color}.600`} fontWeight={isBold ? "800" : "bold"}>
          TZS {value.toLocaleString()}
        </StatNumber>
      </Stat>
    </Box>
  )
}