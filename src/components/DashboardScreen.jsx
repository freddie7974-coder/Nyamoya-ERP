// src/components/DashboardScreen.jsx
import { useState, useEffect } from 'react'
import { 
  Box, SimpleGrid, Stat, StatLabel, StatNumber, StatHelpText, StatArrow,
  Heading, Text, Button, VStack, HStack, Badge, Spinner, 
  Alert, AlertIcon, AlertTitle, AlertDescription, Flex, ButtonGroup
} from '@chakra-ui/react'
import { collection, getDocs } from 'firebase/firestore'
import { signOut } from 'firebase/auth' 
import { db, auth } from '../firebase' 

export default function DashboardScreen({ userRole, onNavigate, onLogout }) {
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('month') // 'month' or 'all'
  
  // We now store TWO sets of data
  const [stats, setStats] = useState({
    month: { sales: 0, expenses: 0, wastage: 0, profit: 0 },
    all:   { sales: 0, expenses: 0, wastage: 0, profit: 0 }
  })

  const [lowStockItems, setLowStockItems] = useState([])

  // 🧹 CLEANER: Prevents the "$0" Error
  const safeNumber = (val) => {
    if (!val) return 0
    if (typeof val === 'number') return val
    const cleanString = String(val).replace(/,/g, '').replace(/[^0-9.-]+/g,"")
    return Number(cleanString) || 0
  }

  // 🗓️ DATE HELPER: Handles strings and Timestamps safely
  const parseDate = (val) => {
    if (!val) return null
    if (val.toDate) return val.toDate() // Firestore Timestamp
    return new Date(val) // String or JS Date
  }

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      const now = new Date()
      // Start of current month (e.g., Jan 1st, 00:00:00)
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1) 

      // Initialize counters
      let mSales = 0, allSales = 0
      let mExp = 0,   allExp = 0
      let mWast = 0,  allWast = 0

      // 1. PROCESS SALES
      const salesSnap = await getDocs(collection(db, "sales"))
      salesSnap.forEach(doc => {
        const data = doc.data()
        const amount = safeNumber(data.totalAmount || data.amount || data.total)
        const dateObj = parseDate(data.timestamp || data.date)

        // Always add to All-Time
        allSales += amount
        
        // Only add to Month if date matches
        if (dateObj && dateObj >= startOfMonth) {
          mSales += amount
        }
      })

      // 2. PROCESS EXPENSES
      const expSnap = await getDocs(collection(db, "expenses"))
      expSnap.forEach(doc => {
        const data = doc.data()
        const amount = safeNumber(data.amount || data.cost || data.total)
        const dateObj = parseDate(data.timestamp || data.date)

        allExp += amount
        if (dateObj && dateObj >= startOfMonth) {
          mExp += amount
        }
      })

      // 3. PROCESS WASTAGE
      const wasteSnap = await getDocs(collection(db, "wastage"))
      wasteSnap.forEach(doc => {
        const data = doc.data()
        const amount = safeNumber(data.totalValue || data.cost)
        const dateObj = parseDate(data.timestamp || data.date)

        allWast += amount
        if (dateObj && dateObj >= startOfMonth) {
          mWast += amount
        }
      })

      // 4. LOW STOCK (Unchanged)
      const lowItems = []
      const rawSnap = await getDocs(collection(db, "raw_materials"))
      rawSnap.forEach(doc => {
        const data = doc.data()
        if (safeNumber(data.currentStock) < 20) {
          lowItems.push({ name: data.name, stock: data.currentStock, type: 'Raw Material' })
        }
      })
      const prodSnap = await getDocs(collection(db, "inventory"))
      prodSnap.forEach(doc => {
        const data = doc.data()
        if (safeNumber(data.currentStock) < 10) {
          lowItems.push({ name: data.name, stock: data.currentStock, type: 'Product' })
        }
      })

      // 5. UPDATE STATE
      setStats({
        month: { 
          sales: mSales, expenses: mExp, wastage: mWast, 
          profit: mSales - (mExp + mWast) 
        },
        all: { 
          sales: allSales, expenses: allExp, wastage: allWast, 
          profit: allSales - (allExp + allWast) 
        }
      })
      setLowStockItems(lowItems)

    } catch (error) {
      console.error("Error loading dashboard:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSignOut = async () => {
    await signOut(auth) 
    onLogout() 
  }

  if (loading) return (
    <Flex justify="center" align="center" h="50vh">
      <Spinner size="xl" color="teal.500" thickness="4px" />
    </Flex>
  )

  // Select data based on filter toggle
  const current = filter === 'month' ? stats.month : stats.all
  
  const isProfit = current.profit >= 0
  const profitColor = isProfit ? "green.600" : "red.600"
  const profitBg = isProfit ? "green.50" : "red.50"

  return (
    <Box p={4} maxW="1200px" mx="auto">
      
      {/* HEADER */}
      <HStack justifyContent="space-between" mb={6} flexWrap="wrap" spacing={4}>
        <VStack align="start" spacing={0}>
          <Heading size="lg" color="teal.700">Nyamoya ERP 🏭</Heading>
          <Text color="gray.500">Welcome, {userRole === 'admin' ? 'Boss' : 'Staff'}!</Text>
        </VStack>
        
        <HStack>
          <Badge colorScheme="teal" p={2} borderRadius="md" fontSize="0.9em">
            📅 {new Date().toLocaleDateString()}
          </Badge>
          <Button size="sm" colorScheme="red" variant="outline" onClick={handleSignOut}>
            Logout
          </Button>
        </HStack>
      </HStack>

      {/* 🚨 LOW STOCK ALERTS */}
      {lowStockItems.length > 0 && (
        <Box mb={8}>
          <Alert status="error" variant="left-accent" borderRadius="md" flexDirection="column" alignItems="start" p={4} shadow="sm">
            <HStack mb={2}>
              <AlertIcon boxSize="24px" />
              <AlertTitle fontSize="lg">Low Stock Warning</AlertTitle>
            </HStack>
            <AlertDescription w="100%">
              <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={3} mt={2}>
                {lowStockItems.map((item, idx) => (
                  <HStack key={idx} bg="white" p={2} borderRadius="md" border="1px solid" borderColor="red.100" justifyContent="space-between">
                    <Text fontWeight="bold" color="red.700">{item.name}</Text>
                    <Badge colorScheme="red">{item.stock} Left</Badge>
                  </HStack>
                ))}
              </SimpleGrid>
            </AlertDescription>
          </Alert>
        </Box>
      )}

      {/* 🔘 FILTER TOGGLE */}
      <Flex justify="center" mb={6}>
        <ButtonGroup isAttached variant="outline" size="sm">
          <Button 
            colorScheme={filter === 'month' ? "teal" : "gray"} 
            bg={filter === 'month' ? "teal.500" : "white"}
            color={filter === 'month' ? "white" : "gray.600"}
            onClick={() => setFilter('month')}
          >
            This Month
          </Button>
          <Button 
            colorScheme={filter === 'all' ? "teal" : "gray"} 
            bg={filter === 'all' ? "teal.500" : "white"}
            color={filter === 'all' ? "white" : "gray.600"}
            onClick={() => setFilter('all')}
          >
            All Time (Lifetime)
          </Button>
        </ButtonGroup>
      </Flex>

      {/* 💰 FINANCIAL STATS CARDS */}
      <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6} mb={8}>
        
        {/* REVENUE */}
        <Box p={6} bg="white" shadow="md" borderRadius="xl" borderLeft="4px solid" borderColor="green.400">
          <Stat>
            <StatLabel fontSize="lg" color="gray.500">Sales ({filter === 'month' ? 'Jan' : 'All'})</StatLabel>
            <StatNumber fontSize="3xl" fontWeight="800" color="green.600">
              TZS {current.sales.toLocaleString()}
            </StatNumber>
            <StatHelpText>{filter === 'month' ? 'Income this month' : 'Lifetime Income'}</StatHelpText>
          </Stat>
        </Box>

        {/* EXPENSES */}
        <Box p={6} bg="white" shadow="md" borderRadius="xl" borderLeft="4px solid" borderColor="red.400">
          <Stat>
            <StatLabel fontSize="lg" color="gray.500">Costs ({filter === 'month' ? 'Jan' : 'All'})</StatLabel>
            <StatNumber fontSize="3xl" fontWeight="800" color="red.600">
              TZS {(current.expenses + current.wastage).toLocaleString()}
            </StatNumber>
            <StatHelpText>Expenses + Wastage</StatHelpText>
          </Stat>
        </Box>

        {/* NET PROFIT */}
        <Box p={6} bg={profitBg} shadow="md" borderRadius="xl" borderLeft="4px solid" borderColor={isProfit ? "green.600" : "red.600"}>
          <Stat>
            <StatLabel fontSize="lg" fontWeight="bold" color="gray.600">NET PROFIT</StatLabel>
            <Flex alignItems="center">
                <StatArrow type={isProfit ? 'increase' : 'decrease'} />
                <StatNumber fontSize="3xl" fontWeight="800" color={profitColor}>
                  TZS {current.profit.toLocaleString()}
                </StatNumber>
            </Flex>
            <StatHelpText fontWeight="bold">
                {isProfit ? "Profitable 🚀" : "Loss Detected ⚠️"}
            </StatHelpText>
          </Stat>
        </Box>

      </SimpleGrid>

      {/* 🚀 OPERATIONS MENU */}
      <Heading size="md" mb={4} color="gray.600">Operations</Heading>
      <SimpleGrid columns={{ base: 2, md: 3, lg: 4 }} spacing={6}>
        <MenuCard label="New Sale" color="teal" icon="💰" onClick={() => onNavigate('sales')} />
        <MenuCard label="Production" color="orange" icon="🏭" onClick={() => onNavigate('production')} />
        <MenuCard label="Delivery" color="cyan" icon="🚚" onClick={() => onNavigate('delivery')} />
        {userRole === 'admin' && <MenuCard label="Staff (HR)" color="pink" icon="👥" onClick={() => onNavigate('hr')} />}
      </SimpleGrid>

      {/* 🛡️ ADMIN CONTROLS */}
      {userRole === 'admin' && (
        <>
          <Heading size="md" mt={10} mb={4} color="gray.600">Admin Controls 🛡️</Heading>
          <SimpleGrid columns={{ base: 2, md: 3, lg: 4 }} spacing={6} mb={10}>
            <MenuCard label="Raw Materials" color="green" icon="🥜" onClick={() => onNavigate('raw_materials')} />
            <MenuCard label="Product Stock" color="purple" icon="📦" onClick={() => onNavigate('stock')} />
            <MenuCard label="Expenses" color="red" icon="💸" onClick={() => onNavigate('expense')} />
            <MenuCard label="Analytics" color="blue" icon="📈" onClick={() => onNavigate('analytics')} />
            <MenuCard label="Wastage" color="gray" icon="🗑️" onClick={() => onNavigate('wastage')} />
            <MenuCard label="Customers" color="cyan" icon="🤝" onClick={() => onNavigate('customers')} />
            <MenuCard label="Suppliers" color="orange" icon="🚛" onClick={() => onNavigate('suppliers')} />
            <MenuCard label="Audit Logs" color="blackAlpha" icon="🛡️" onClick={() => onNavigate('audit')} />
          </SimpleGrid>
        </>
      )}
    </Box>
  )
}

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
      height="140px" 
      width="100%"
      borderBottom="4px solid"
      borderColor={`${color}.200`}
    >
      <Text fontSize="4xl" mb={2}>{icon}</Text>
      <Heading size="xs" textAlign="center" color={`${color}.600`}>{label}</Heading>
    </Box>
  )
}