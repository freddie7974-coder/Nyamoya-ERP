// src/components/DataExportScreen.jsx
import { useState } from 'react'
import {
  Box, Heading, Text, SimpleGrid, Button, Icon, VStack, HStack,
  useToast, Card, CardBody, Badge, ButtonGroup
} from '@chakra-ui/react'
import { ArrowBackIcon, DownloadIcon, AttachmentIcon } from '@chakra-ui/icons'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '../firebase'

// 🖨️ PDF LIBRARIES
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export default function DataExportScreen({ onBack }) {
  const [loading, setLoading] = useState(null) // Stores which button is working
  const toast = useToast()

  // 🛠️ HELPER: Formats Dates
  const formatDate = (val) => {
    if (!val) return '-'
    if (val.toDate) return val.toDate().toLocaleDateString()
    if (val instanceof Date) return val.toLocaleDateString()
    return String(val)
  }

  // 📄 PDF GENERATOR
  const generatePDF = (data, title, filename) => {
    const doc = new jsPDF()

    // 1. Add Title & Header
    doc.setFontSize(18)
    doc.text("Nyamoya ERP", 14, 20)
    
    doc.setFontSize(14)
    doc.setTextColor(100)
    doc.text(title, 14, 30)
    
    doc.setFontSize(10)
    doc.setTextColor(150)
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 36)

    // 2. Define Columns based on Data Headers
    const headers = Object.keys(data[0]).map(key => key.toUpperCase())
    
    // 3. Create Rows
    const rows = data.map(row => Object.values(row))

    // 4. Generate Table
    autoTable(doc, {
      startY: 45,
      head: [headers],
      body: rows,
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [44, 122, 123] } // Teal Color
    })

    // 5. Save
    doc.save(`${filename}.pdf`)
  }

  // 📊 CSV GENERATOR
  const generateCSV = (data, filename) => {
    const headers = Object.keys(data[0])
    const csvRows = [headers.join(',')]

    for (const row of data) {
      const values = headers.map(header => {
        const escaped = ('' + row[header]).replace(/"/g, '\\"')
        return `"${escaped}"`
      })
      csvRows.push(values.join(','))
    }

    const csvString = csvRows.join('\n')
    const blob = new Blob([csvString], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${filename}.csv`
    a.click()
  }

  // ⬇️ MAIN EXPORT LOGIC
  const handleExport = async (collectionName, filename, format) => {
    setLoading(`${collectionName}-${format}`) // Unique loader ID
    try {
      const querySnapshot = await getDocs(collection(db, collectionName))
      const rawData = []

      querySnapshot.forEach((doc) => {
        const d = doc.data()
        let cleanRow = {}

        // 🧼 CLEANUP DATA FOR REPORTS
        if (collectionName === 'sales') {
          cleanRow = {
            Date: formatDate(d.timestamp || d.date),
            Customer: d.customerName || 'Walk-in',
            Items: Array.isArray(d.items) ? d.items.map(i => `${i.name} x${i.qty}`).join(', ') : 'N/A',
            Total: d.totalAmount || 0,
            Method: d.paymentMethod || 'Cash'
          }
        } else if (collectionName === 'expenses') {
          cleanRow = {
            Date: formatDate(d.timestamp || d.date),
            Category: d.category || 'General',
            Description: d.description || '-',
            Amount: d.amount || d.cost || 0
          }
        } else if (collectionName === 'inventory') {
          cleanRow = {
            Product: d.name,
            Stock: d.currentStock || 0,
            Price: d.price || 0,
            Category: d.category || '-'
          }
        } else if (collectionName === 'raw_materials') {
          cleanRow = {
            Material: d.name,
            Stock: d.currentStock || 0,
            Unit: d.unit || 'kg'
          }
        } else if (collectionName === 'customers') {
          cleanRow = {
            Name: d.name,
            Phone: d.phone || '-',
            Email: d.email || '-',
            Address: d.address || '-'
          }
        } else {
          cleanRow = { ...d, id: doc.id } 
        }
        rawData.push(cleanRow)
      })

      if (rawData.length === 0) {
        toast({ title: "No data found.", status: "info" })
        return
      }

      // DECIDE FORMAT
      if (format === 'pdf') {
        const prettyTitle = filename.replace('Nyamoya_', '').replace(/([A-Z])/g, ' $1').trim() + " Report"
        generatePDF(rawData, prettyTitle, filename)
      } else {
        generateCSV(rawData, filename)
      }

      toast({ title: "Download Started! 🚀", status: "success" })

    } catch (error) {
      console.error(error)
      toast({ title: "Export Failed", description: error.message, status: "error" })
    } finally {
      setLoading(null)
    }
  }

  return (
    <Box p={5} maxW="1000px" mx="auto">
      {/* Header */}
      <HStack mb={8} spacing={4}>
        <Icon as={ArrowBackIcon} boxSize={8} cursor="pointer" onClick={onBack} color="gray.600" />
        <VStack align="start" spacing={0}>
          <Heading size="lg" color="teal.700">Data Reports 🖨️</Heading>
          <Text color="gray.500">Download clean PDF reports or Excel files</Text>
        </VStack>
      </HStack>

      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
        
        {/* FINANCIALS */}
        <ExportCard 
          title="Sales Records" 
          desc="Full history of sales transactions."
          color="green"
          colId="sales"
          fileId="Nyamoya_Sales"
          loading={loading}
          onExport={handleExport}
        />

        <ExportCard 
          title="Expense Report" 
          desc="Operating costs and expenses."
          color="red"
          colId="expenses"
          fileId="Nyamoya_Expenses"
          loading={loading}
          onExport={handleExport}
        />

        {/* INVENTORY */}
        <ExportCard 
          title="Finished Goods" 
          desc="Stock levels of products."
          color="purple"
          colId="inventory"
          fileId="Nyamoya_Products"
          loading={loading}
          onExport={handleExport}
        />

        <ExportCard 
          title="Raw Materials" 
          desc="Stock of peanuts, sugar, oil."
          color="orange"
          colId="raw_materials"
          fileId="Nyamoya_RawMaterials"
          loading={loading}
          onExport={handleExport}
        />

        {/* PARTNERS */}
        <ExportCard 
          title="Customer List" 
          desc="Contact details database."
          color="cyan"
          colId="customers"
          fileId="Nyamoya_Customers"
          loading={loading}
          onExport={handleExport}
        />

        <ExportCard 
          title="Suppliers" 
          desc="Vendor contact list."
          color="blue"
          colId="suppliers"
          fileId="Nyamoya_Suppliers"
          loading={loading}
          onExport={handleExport}
        />

      </SimpleGrid>
    </Box>
  )
}

// 🎨 Card with Dual Buttons
function ExportCard({ title, desc, color, colId, fileId, loading, onExport }) {
  return (
    <Card 
      variant="outline" 
      borderColor={`${color}.200`} 
      borderTopWidth="4px" 
      borderTopColor={`${color}.400`}
      _hover={{ shadow: 'md' }}
    >
      <CardBody>
        <Heading size="md" color={`${color}.700`} mb={2}>{title}</Heading>
        <Text fontSize="sm" color="gray.600" mb={5} minH="40px">{desc}</Text>
        
        <ButtonGroup w="100%" isAttached variant="outline">
          <Button 
            w="50%"
            leftIcon={<AttachmentIcon />} 
            colorScheme={color}
            onClick={() => onExport(colId, fileId, 'csv')}
            isLoading={loading === `${colId}-csv`}
            loadingText="CSV..."
          >
            Excel / CSV
          </Button>
          <Button 
            w="50%"
            leftIcon={<DownloadIcon />} 
            colorScheme="gray"
            bg="gray.100" 
            color="red.600"
            _hover={{ bg: 'red.50' }}
            onClick={() => onExport(colId, fileId, 'pdf')}
            isLoading={loading === `${colId}-pdf`}
            loadingText="PDF..."
          >
            PDF Report
          </Button>
        </ButtonGroup>
      </CardBody>
    </Card>
  )
}