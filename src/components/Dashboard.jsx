// src/components/Dashboard.jsx
import { useState, useEffect } from 'react'
import { Box, SimpleGrid, Stat, StatLabel, StatNumber, StatHelpText, Heading, Text, Button, VStack, HStack, Icon, Badge, Spinner, Alert, AlertIcon, AlertTitle, AlertDescription } from '@chakra-ui/react'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '../firebase'

export default function Dashboard({ userRole, onNavigate }) {
  const [stats, setStats] = useState({
    todaySales: 0,
    monthSales: 0,
    lowStockItems: [] // 🚨 This is the new Intelligence
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      // 1. Calculate Sales (Simplified for Dashboard)
      // In a real app, you'd filter by date. Here we assume we want a quick snapshot.
      const salesSnap = await getDocs(collection(db, "sales"))
      let total = 0
      salesSnap.forEach(doc => total += doc.data().totalAmount || 0)

      // 2. INTELLIGENCE: Find Low Stock Items 🕵️‍♂️
      // (Raw Materials < 10 units, Products < 10 units)
      const lowItems = []
      
      const rawSnap = await getDocs(collection(db, "raw_materials"))
      rawSnap.forEach(doc => {
        const data = doc.data()
        // Threshold: Warn if stock is below 20
        if ((data.currentStock || 0) < 20) {
          lowItems.push({ name: data.name, stock: data.currentStock, type: 'Raw Material' })
        }
      })

      const prodSnap = await getDocs(collection(db, "inventory"))
      prodSnap.forEach(doc => {
        const data = doc.data()
        // Threshold: Warn if stock is below 10
        if ((data.currentStock || 0) < 10) {
          lowItems.push({ name: data.name, stock: data.currentStock, type: 'Product' })
        }
      })

      setStats({
        todaySales: total, // Placeholder for total revenue
        monthSales: total, 
        lowStockItems: lowItems
      })

    } catch (error) {
      console.error("Error loading dashboard:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <Box p={10} textAlign="center"><Spinner size="xl" /></Box>

  return (
    <Box p={4} maxW="1200px" mx="auto">
      <HStack justifyContent="space-between" mb={6}>
        <VStack align="start" spacing={0}>
          <Heading size="lg" color="teal.700">Nyamoya ERP 🏭</Heading>
          <Text color="gray.500">Welcome back, {userRole === 'admin' ? 'Boss' : 'Staff'}!</Text>
        </VStack>
        <Badge colorScheme="teal" p={2} borderRadius="md" fontSize="0.9em">
          {new Date().toLocaleDateString()}
        </Badge>
      </HStack>

      {/* 🚨 INTELLIGENCE SECTION: LOW STOCK ALERTS */}
      {stats.lowStockItems.length > 0 && (
        <Box mb={8}>
          <Alert status="error" variant="left-accent" borderRadius="md" flexDirection="column" alignItems="start" p={4}>
            <HStack mb={2}>
              <AlertIcon boxSize="24px" />
              <AlertTitle fontSize="lg">Action Required: Low Stock Detected!</AlertTitle>
            </HStack>
            <AlertDescription w="100%">
              <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={3} mt={2}>
                {stats.lowStockItems.map((item, idx) => (
                  <HStack key={idx} bg="red.50" p={2} borderRadius="md" justifyContent="space-between">
                    <Text fontWeight="bold" color="red.700">{item.name}</Text>
                    <Badge colorScheme="red">{item.stock} Left</Badge>
                  </HStack>
                ))}
              </SimpleGrid>
              {userRole === 'admin' && (
                <Button size="sm" colorScheme="red" mt={4} onClick={() => onNavigate(stats.lowStockItems[0].type === 'Raw Material' ? 'raw_materials' : 'production')}>
                  Restock Now →
                </Button>
              )}
            </AlertDescription>
          </Alert>
        </Box>
      )}

      {/* 1. Quick Stats */}
      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6} mb={8}>
        <Box p={6} bg="white" shadow="md" borderRadius="xl" borderLeft="4px solid" borderColor="teal.500">
          <Stat>
            <StatLabel fontSize="lg" color="gray.500">Total Revenue</StatLabel>
            <StatNumber fontSize="3xl" fontWeight="800" color="teal.600">
              TZS {stats.todaySales.toLocaleString()}
            </StatNumber>
            <StatHelpText>Lifetime Sales Volume</StatHelpText>
          </Stat>
        </Box>
        <Box p={6} bg="white" shadow="md" borderRadius="xl" borderLeft="4px solid" borderColor="blue.500">
          <Stat>
            <StatLabel fontSize="lg" color="gray.500">System Status</StatLabel>
            <StatNumber fontSize="3xl" fontWeight="800" color="blue.600">
              Active
            </StatNumber>
            <StatHelpText>Database Connected 🟢</StatHelpText>
          </Stat>
        </Box>
      </SimpleGrid>

      {/* 2. Main Menu Grid */}
      <Heading size="md" mb={4} color="gray.600">Operations</Heading>
      <SimpleGrid columns={{ base: 2, md: 3, lg: 4 }} spacing={6}>
        
        {/* SALE (Everyone) */}
        <MenuCard 
          label="New Sale" 
          color="teal" 
          icon="💰" 
          onClick={() => onNavigate('sale')} 
        />
        
        {/* PRODUCTION (Everyone) */}
        <MenuCard 
          label="Production" 
          color="orange" 
          icon="🏭" 
          onClick={() => onNavigate('production')} 
        />
        
        {/* DELIVERY (Everyone) */}
        <MenuCard 
          label="Delivery" 
          color="cyan" 
          icon="🚚" 
          onClick={() => onNavigate('delivery')} 
        />

        {/* HR (Admin Only) */}
        {userRole === 'admin' && (
          <MenuCard 
            label="Staff (HR)" 
            color="pink" 
            icon="👥" 
            onClick={() => onNavigate('hr')} 
          />
        )}
      </SimpleGrid>

      {/* 3. Admin Controls (Restricted) */}
      {userRole === 'admin' && (
        <>
          <Heading size="md" mt={10} mb={4} color="gray.600">Admin Controls 🛡️</Heading>
          <SimpleGrid columns={{ base: 2, md: 3, lg: 4 }} spacing={6} mb={10}>
            
            <MenuCard label="Raw Materials" color="green" icon="🥜" onClick={() => onNavigate('raw_materials')} />
            <MenuCard label="Product Catalogue" color="purple" icon="📦" onClick={() => onNavigate('stock')} />
            <MenuCard label="Expenses" color="red" icon="💸" onClick={() => onNavigate('expense')} />
            <MenuCard label="Analytics & Profit" color="purple" icon="📈" onClick={() => onNavigate('analytics')} />
            <MenuCard label="Customers (CRM)" color="blue" icon="🤝" onClick={() => onNavigate('customers')} />
            <MenuCard label="Suppliers" color="orange" icon="🚛" onClick={() => onNavigate('suppliers')} />
            <MenuCard label="Report Wastage" color="red" icon="🗑️" onClick={() => onNavigate('wastage')} />
            
            {/* Audit Logs */}
            <MenuCard label="Audit Logs" color="blackAlpha" icon="🛡️" onClick={() => onNavigate('audit')} />
            
            {/* Data Export (Missing Link) */}
            <MenuCard label="Export Data" color="gray" icon="💾" onClick={() => onNavigate('export')} />

          </SimpleGrid>
        </>
      )}
    </Box>
  )
}

// Simple Card Component
function MenuCard({ label, color, icon, onClick }) {
  return (
    <Box 
      as="button"
      onClick={onClick}
      p={6} 
      bg="white" 
      shadow="md" 
      borderRadius="xl" 
      transition="all 0.2s"
      _hover={{ transform: 'translateY(-5px)', shadow: 'lg', bg: `${color}.50` }}
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      height="150px"
      width="100%"
    >
      <Text fontSize="4xl" mb={2}>{icon}</Text>
      <Heading size="sm" color={`${color}.600`}>{label}</Heading>
    </Box>
  )
}