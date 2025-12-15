// src/components/DataExportScreen.jsx
import { useState } from 'react'
import { Box, Button, Heading, VStack, Text, HStack, SimpleGrid, useToast, Icon } from '@chakra-ui/react'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '../firebase'

export default function DataExportScreen({ onBack }) {
  const [loading, setLoading] = useState(false)
  const toast = useToast()

  // 🛠️ Helper: Convert Data to CSV (Excel Format)
  const downloadCSV = (data, filename) => {
    if (data.length === 0) {
      toast({ title: "No data to export", status: "warning" })
      return
    }

    // 1. Get Headers (Keys)
    const headers = Object.keys(data[0]).join(",")
    
    // 2. Format Rows
    const rows = data.map(row => 
      Object.values(row).map(value => {
        // Handle dates or objects safely
        if (typeof value === 'object' && value !== null) {
          // If it's a Firestore timestamp, convert to string
          if (value.seconds) return new Date(value.seconds * 1000).toLocaleDateString()
          return JSON.stringify(value).replace(/,/g, ";") // Escape commas
        }
        return `"${value}"` // Quote strings to handle commas inside text
      }).join(",")
    )

    // 3. Combine
    const csvContent = "data:text/csv;charset=utf-8," + headers + "\n" + rows.join("\n")
    
    // 4. Trigger Download
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `${filename}_${new Date().toISOString().slice(0,10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // 📥 EXPORT FUNCTIONS
  const exportCollection = async (collectionName, filename) => {
    setLoading(true)
    try {
      const querySnapshot = await getDocs(collection(db, collectionName))
      const data = []
      
      querySnapshot.forEach((doc) => {
        // Clean up data for Excel
        const raw = doc.data()
        // Flatten specific fields if needed
        const cleanRow = {
          ID: doc.id,
          ...raw
        }
        data.push(cleanRow)
      })

      downloadCSV(data, filename)
      toast({ title: "Download Started! 🚀", status: "success" })

    } catch (error) {
      console.error(error)
      toast({ title: "Export Failed", status: "error" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box p={4} maxW="800px" mx="auto">
      <HStack mb={8}>
        <Button onClick={onBack} variant="ghost">← Back</Button>
        <Heading size="md" color="gray.700">Data Backup & Export 💾</Heading>
      </HStack>

      <Box bg="blue.50" p={6} borderRadius="xl" mb={8}>
        <Text fontSize="lg" fontWeight="bold" color="blue.800">Why Export?</Text>
        <Text color="blue.700">
          Download your data to view it in Microsoft Excel or Google Sheets. 
          This is useful for advanced accounting or creating weekly reports for investors.
        </Text>
      </Box>

      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
        
        {/* Sales Export */}
        <ExportCard 
          title="Sales Records" 
          desc="Download all invoice history, items sold, and revenue." 
          color="teal" 
          onClick={() => exportCollection('sales', 'Nyamoya_Sales')}
          loading={loading}
        />

        {/* Expenses Export */}
        <ExportCard 
          title="Expense Report" 
          desc="Download operating costs, raw material purchases, and wastage." 
          color="red" 
          onClick={() => exportCollection('expenses', 'Nyamoya_Expenses')}
          loading={loading}
        />

        {/* Inventory Export */}
        <ExportCard 
          title="Current Inventory" 
          desc="Snapshot of current stock levels and valuations." 
          color="purple" 
          onClick={() => exportCollection('inventory', 'Nyamoya_Stock')}
          loading={loading}
        />

        {/* Customers Export */}
        <ExportCard 
          title="Customer List (CRM)" 
          desc="Download contacts for marketing campaigns." 
          color="blue" 
          onClick={() => exportCollection('customers', 'Nyamoya_Customers')}
          loading={loading}
        />

      </SimpleGrid>
    </Box>
  )
}

function ExportCard({ title, desc, color, onClick, loading }) {
  return (
    <Button 
      h="auto" 
      py={6} 
      flexDirection="column" 
      alignItems="flex-start" 
      colorScheme={color} 
      variant="outline" 
      onClick={onClick}
      isDisabled={loading}
      _hover={{ bg: `${color}.50`, transform: 'scale(1.02)' }}
      transition="all 0.2s"
    >
      <HStack mb={2}>
        <Text fontSize="2xl">📥</Text>
        <Text fontSize="lg" fontWeight="bold">{title}</Text>
      </HStack>
      <Text fontSize="sm" fontWeight="normal" color="gray.600" textAlign="left">
        {desc}
      </Text>
    </Button>
  )
}