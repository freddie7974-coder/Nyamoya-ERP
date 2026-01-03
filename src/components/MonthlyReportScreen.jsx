// src/components/MonthlyReportScreen.jsx
import { useState, useEffect } from 'react'
import { Box, Button, Heading, Select, SimpleGrid, Stat, StatLabel, StatNumber, Table, Tbody, Tr, Td, Spinner, Text, useToast, HStack } from '@chakra-ui/react'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '../firebase'

// 👇 PDF Libraries
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export default function MonthlyReportScreen({ onBack }) {
  const [loading, setLoading] = useState(false)
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth()) 
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const toast = useToast()
  
  const [report, setReport] = useState({
    sales: 0,
    expenses: 0,
    wastage: 0,
    netProfit: 0,
    transactionCount: 0
  })

  const [details, setDetails] = useState({
    salesList: [],
    expensesList: [],
    wastageList: []
  })

  const years = Array.from({length: 6}, (_, i) => 2024 + i)
  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]

  const getSafeDate = (data, fieldName) => {
    try {
      if (data[fieldName] && typeof data[fieldName].toDate === 'function') return data[fieldName].toDate()
      if (data[fieldName] instanceof Date) return data[fieldName]
      return null
    } catch (err) { return null }
  }

  const generateReport = async () => {
    setLoading(true)
    try {
      const start = new Date(selectedYear, selectedMonth, 1)
      const end = new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59)

      let totalSales = 0, totalTx = 0, totalExpenses = 0, totalWastage = 0
      
      const sList = []
      const eList = []
      const wList = []

      // 1. Sales
      const salesSnap = await getDocs(collection(db, "sales"))
      salesSnap.forEach(doc => {
        const data = doc.data()
        const date = getSafeDate(data, 'createdAt') || getSafeDate(data, 'date')
        if (date && date >= start && date <= end) {
          const amt = parseFloat(data.totalAmount || 0)
          totalSales += amt
          totalTx++
          // Save simple ID and formatted amount
          sList.push({ 
            date: date.toLocaleDateString(), 
            id: doc.id.substring(0, 8), 
            amount: amt 
          })
        }
      })

      // 2. Expenses
      const expSnap = await getDocs(collection(db, "expenses"))
      expSnap.forEach(doc => {
        const data = doc.data()
        const date = getSafeDate(data, 'date') || getSafeDate(data, 'createdAt')
        if (date && date >= start && date <= end) {
          const amt = parseFloat(data.amount || 0)
          totalExpenses += amt
          eList.push({ 
            date: date.toLocaleDateString(), 
            category: data.category, 
            desc: data.description || '-', 
            amount: amt 
          })
        }
      })

      // 3. Wastage
      const wasteSnap = await getDocs(collection(db, "wastage"))
      wasteSnap.forEach(doc => {
        const data = doc.data()
        const date = getSafeDate(data, 'reportedAt') || getSafeDate(data, 'date')
        if (date && date >= start && date <= end) {
          const val = parseFloat(data.lossValue || 0)
          totalWastage += val
          wList.push({ 
            date: date.toLocaleDateString(), 
            item: data.itemName, 
            reason: data.reason, 
            amount: val 
          })
        }
      })

      setReport({
        sales: totalSales,
        expenses: totalExpenses,
        wastage: totalWastage,
        netProfit: totalSales - totalExpenses - totalWastage,
        transactionCount: totalTx
      })

      setDetails({ salesList: sList, expensesList: eList, wastageList: wList })

    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  // 📄 1. PDF DOWNLOAD FUNCTION
  const handleDownloadPDF = () => {
    const doc = new jsPDF()

    // Header
    doc.setFillColor(44, 122, 123) 
    doc.rect(0, 0, 210, 40, 'F') 
    
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(22)
    doc.text("Nyamoya Enterprises", 14, 20)
    doc.setFontSize(14)
    doc.text("Monthly Performance Report", 14, 30)
    
    doc.setTextColor(0, 0, 0)
    doc.setFontSize(10)
    doc.text(`Period: ${months[selectedMonth]} ${selectedYear}`, 14, 50)
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 55)

    // Financial Summary Box
    doc.setDrawColor(200, 200, 200)
    doc.setFillColor(245, 245, 245)
    doc.roundedRect(14, 60, 180, 40, 3, 3, 'FD')

    doc.setFontSize(12)
    doc.text("Gross Revenue:", 20, 75)
    doc.text(`TZS ${report.sales.toLocaleString()}`, 100, 75)
    
    doc.setTextColor(200, 0, 0)
    doc.text("Total Expenses:", 20, 85)
    doc.text(`- TZS ${report.expenses.toLocaleString()}`, 100, 85)

    doc.setTextColor(220, 110, 0)
    doc.text("Wastage Losses:", 20, 95)
    doc.text(`- TZS ${report.wastage.toLocaleString()}`, 100, 95)
    
    // Net Profit
    doc.setTextColor(0, 0, 0)
    doc.setFontSize(14)
    doc.setFont(undefined, 'bold')
    doc.text("NET PROFIT:", 120, 95)
    doc.setTextColor(report.netProfit >= 0 ? 0 : 255, report.netProfit >= 0 ? 128 : 0, 0)
    doc.text(`TZS ${report.netProfit.toLocaleString()}`, 160, 95)

    let yPos = 110

    // Expenses Table
    if (details.expensesList.length > 0) {
      doc.setFont(undefined, 'normal')
      doc.setTextColor(0)
      doc.setFontSize(14)
      doc.text("Detailed Expenses", 14, yPos)
      
      autoTable(doc, {
        startY: yPos + 5,
        head: [['Date', 'Category', 'Description', 'Amount']],
        body: details.expensesList.map(item => [item.date, item.category, item.desc, item.amount.toLocaleString()]),
        theme: 'striped',
        headStyles: { fillColor: [200, 50, 50] }
      })
      yPos = doc.lastAutoTable.finalY + 15
    }

    // Wastage Table
    if (details.wastageList.length > 0) {
      doc.text("Wastage & Breakage", 14, yPos)
      autoTable(doc, {
        startY: yPos + 5,
        head: [['Date', 'Item', 'Reason', 'Value Lost']],
        body: details.wastageList.map(item => [item.date, item.item, item.reason, item.amount.toLocaleString()]),
        theme: 'striped',
        headStyles: { fillColor: [220, 140, 0] }
      })
      yPos = doc.lastAutoTable.finalY + 15
    }
    
    doc.save(`Nyamoya_Report_${months[selectedMonth]}_${selectedYear}.pdf`)
  }

  // 📊 2. EXCEL (CSV) DOWNLOAD FUNCTION
  const handleDownloadCSV = () => {
    if (details.salesList.length === 0 && details.expensesList.length === 0) {
      toast({ title: "No data to export", status: "warning" })
      return
    }

    let csvContent = "data:text/csv;charset=utf-8,"
    csvContent += `NYAMOYA ERP - MONTHLY REPORT\n`
    csvContent += `Period:,${months[selectedMonth]} ${selectedYear}\n\n`
    
    // Summary
    csvContent += `SUMMARY\n`
    csvContent += `Total Revenue,TZS ${report.sales}\n`
    csvContent += `Total Expenses,TZS ${report.expenses}\n`
    csvContent += `Total Wastage,TZS ${report.wastage}\n`
    csvContent += `NET PROFIT,TZS ${report.netProfit}\n\n`

    // Expenses
    csvContent += `DETAILED EXPENSES\n`
    csvContent += `Date,Category,Description,Amount\n`
    details.expensesList.forEach(row => {
      csvContent += `${row.date},${row.category},"${row.desc}",${row.amount}\n`
    })
    csvContent += `\n`

    // Wastage
    csvContent += `DETAILED WASTAGE LOG\n`
    csvContent += `Date,Item,Reason,Value Loss\n`
    details.wastageList.forEach(row => {
      csvContent += `${row.date},${row.item},${row.reason},${row.amount}\n`
    })
    csvContent += `\n`

    // Sales
    csvContent += `SALES HISTORY\n`
    csvContent += `Date,Receipt ID,Amount\n`
    details.salesList.forEach(row => {
      csvContent += `${row.date},${row.id},${row.amount}\n`
    })

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `Nyamoya_Data_${months[selectedMonth]}.csv`)
    document.body.appendChild(link)
    link.click()
  }

  useEffect(() => {
    generateReport()
  }, [selectedMonth, selectedYear])

  return (
    <Box p={4} maxW="1000px" mx="auto">
      <Button onClick={onBack} mb={6}>← Back to Dashboard</Button>
      
      <Box display="flex" flexDirection={{ base: "column", md: "row" }} justifyContent="space-between" alignItems="center" mb={6} gap={4}>
        <Heading size="lg" color="teal.700">Monthly Archives 📂</Heading>
        
        <Box display="flex" gap={2} flexDirection={{base: "column", sm: "row"}}>
          <Select w="150px" value={selectedMonth} onChange={(e) => setSelectedMonth(parseInt(e.target.value))}>
            {months.map((m, i) => <option key={i} value={i}>{m}</option>)}
          </Select>
          <Select w="100px" value={selectedYear} onChange={(e) => setSelectedYear(parseInt(e.target.value))}>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </Select>
        </Box>
      </Box>

      {/* 👇 DUAL DOWNLOAD BUTTONS */}
      <HStack mb={8} spacing={4} justifyContent="flex-end">
        <Button colorScheme="green" size="sm" onClick={handleDownloadCSV} leftIcon={<Text>📊</Text>}>
          Export Data (Excel)
        </Button>
        <Button colorScheme="red" size="sm" onClick={handleDownloadPDF} leftIcon={<Text>📄</Text>}>
          Download PDF Report
        </Button>
      </HStack>

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