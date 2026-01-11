import { useState, useEffect } from 'react'
import { 
  Box, SimpleGrid, Stat, StatLabel, StatNumber, StatHelpText, StatArrow,
  Heading, Text, Button, VStack, HStack, Badge, Spinner, 
  Alert, AlertIcon, AlertTitle, AlertDescription, Flex 
} from '@chakra-ui/react'
import { collection, getDocs } from 'firebase/firestore'
import { signOut } from 'firebase/auth' 
import { db, auth } from '../firebase' 

export default function DashboardScreen({ userRole, onNavigate, onLogout }) {
  const [loading, setLoading] = useState(true)
  
  // Financial Stats State
  const [financials, setFinancials] = useState({
    sales: 0,
    expenses: 0,
    wastage: 0,
    profit: 0
  })

  // Stock Alerts State
  const [lowStockItems, setLowStockItems] = useState([])

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      // 1. Define "This Month" Range
      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1) 

      // -----------------------------------------
      // 2. Fetch SALES (Income)
      // -----------------------------------------
      const salesSnap = await getDocs(collection(db, "sales"))
      let totalSales = 0
      
      salesSnap.forEach(doc => {
        const data = doc.data()
        
        // Date Check: Handle both Firestore Timestamp and string dates
        let dateObj = null
        if (data.timestamp && typeof data.timestamp.toDate === 'function') {
          dateObj = data.timestamp.toDate()
        } else if (data.date) {
          dateObj = new Date(data.date)
        }

        // Calculation
        // If date exists, check if it's this month. If no date, count it anyway (safety).
        if (!dateObj || dateObj >= startOfMonth) {
           // Checks for 'totalAmount' OR 'amount' OR 'total'
           totalSales += Number(data.totalAmount || data.amount || data.total || 0)
        }
      })

      // -----------------------------------------
      // 3. Fetch EXPENSES (Cost)
      // -----------------------------------------
      const expSnap = await getDocs(collection(db, "expenses"))
      let totalExpenses = 0
      
      expSnap.forEach(doc => {
        const data = doc.data()
        
        // Date Check
        let dateObj = null
        if (data.timestamp && typeof data.timestamp.toDate === 'function') {
          dateObj = data.timestamp.toDate()
        } else if (data.date) {
          dateObj = new Date(data.date)
        }

        if (!dateObj || dateObj >= startOfMonth) {
          // 🚨 UNIVERSAL FIX: Checks 'amount', 'cost', OR 'total'
          // This ensures it finds the number regardless of field name
          totalExpenses += Number(data.amount || data.cost || data.total || 0)
        }
      })

      // -----------------------------------------
      // 4. Fetch WASTAGE (Loss)
      // -----------------------------------------
      const wasteSnap = await getDocs(collection(db, "wastage"))
      let totalWastage = 0
      
      wasteSnap.forEach(doc => {
        const data = doc.data()
        
        // Date Check
        let dateObj = null
        if (data.timestamp && typeof data.timestamp.toDate === 'function') {
          dateObj = data.timestamp.toDate()
        } else if (data.date) {
          dateObj = new Date(data.date)
        }

        if (!dateObj || dateObj >= startOfMonth) {
          totalWastage += Number(data.totalValue || data.cost || 0)
        }
      })

      // -----------------------------------------
      // 5. Fetch Low Stock Alerts
      // -----------------------------------------
      const lowItems = []
      
      // Check Raw Materials (< 20 units)
      const rawSnap = await getDocs(collection(db, "raw_materials"))
      rawSnap.forEach(doc => {
        const data = doc.data()
        // Force number conversion
        if (Number(data.currentStock) < 20) {
          lowItems.push({ name: data.name, stock: data.currentStock, type: 'Raw Material' })
        }
      })

      // Check Finished Products (< 10 units)
      const prodSnap = await getDocs(collection(db, "inventory"))
      prodSnap.forEach(doc => {
        const data = doc.data()
        if (Number(data.currentStock) < 10) {
          lowItems.push({ name: data.name, stock: data.currentStock, type: 'Product' })
        }
      })

      // -----------------------------------------
      // 6. Update State
      // -----------------------------------------
      setFinancials({
        sales: totalSales,
        expenses: totalExpenses,
        wastage: totalWastage,
        // Profit = Sales - (Expenses + Wastage)
        profit: totalSales - (totalExpenses + totalWastage)
      })
      setLowStockItems(lowItems)

    } catch (error) {
      console.error("Error loading dashboard:", error)
    } finally {
      setLoading(false)
    }
  }

  // Logout Function
  const handleSignOut = async () => {
    try {
      await signOut(auth) 
      onLogout()
    } catch (error) {
      console.error("Logout failed", error)
    }
  }

  if (loading) return (
    <Flex justify="center" align="center" h="50vh">
      <Spinner size="xl" color="teal.500" thickness="4px" />
    </Flex>
  )

  // Logic for Profit Color (Green if positive, Red if negative)
  const isProfit = financials.profit >= 0
  const profitColor = isProfit ? "green.600" : "red.600"
  const profitBg = isProfit ? "green.50" : "red.50"

  return (
    <Box p={4} maxW="1200px" mx="auto">
      
      {/* HEADER SECTION */}
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
              <AlertTitle fontSize="lg">Action Required: Low Stock Detected!</AlertTitle>
            </HStack>
            <AlertDescription w="100%">
              <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={3} mt={2}>
                {lowStockItems.map((item, idx) => (
                  <HStack key={idx} bg="white" p={2} borderRadius="md" justifyContent="space-between" border="1px solid" borderColor="red.100">
                    <Text fontWeight="bold" color="red.700">{item.name}</Text>
                    <Badge colorScheme="red">{item.stock} Left</Badge>
                  </HStack>
                ))}
              </SimpleGrid>
            </AlertDescription>
          </Alert>
        </Box>
      )}

      {/* 💰 FINANCIAL STATS CARDS */}
      <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6} mb={8}>
        
        {/* REVENUE */}
        <Box p={6} bg="white" shadow="md" borderRadius="xl" borderLeft="4px solid" borderColor="green.400">
          <Stat>
            <StatLabel fontSize="lg" color="gray.500">Sales (This Month)</StatLabel>
            <StatNumber fontSize="3xl" fontWeight="800" color="green.600">
              KSh {financials.sales.toLocaleString()}
            </StatNumber>
            <StatHelpText>Total Income</StatHelpText>
          </Stat>
        </Box>

        {/* EXPENSES */}
        <Box p={6} bg="white" shadow="md" borderRadius="xl" borderLeft="4px solid" borderColor="red.400">
          <Stat>
            <StatLabel fontSize="lg" color="gray.500">Total Costs</StatLabel>
            <StatNumber fontSize="3xl" fontWeight="800" color="red.600">
              KSh {(financials.expenses + financials.wastage).toLocaleString()}
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
                  KSh {financials.profit.toLocaleString()}
                </StatNumber>
            </Flex>
            <StatHelpText fontWeight="bold">
                {isProfit ? "Great Job! 🚀" : "Check Expenses ⚠️"}
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

      {/* 🛡️ ADMIN CONTROLS (Only visible to Admin) */}
      {userRole === 'admin' && (
        <>
          <Heading size="md" mt={10} mb={4} color="gray.600">Admin Controls 🛡️</Heading>
          <SimpleGrid columns={{ base: 2, md: 3, lg: 4 }} spacing={6} mb={10}>
            
            {/* Inventory */}
            <MenuCard label="Raw Materials" color="green" icon="🥜" onClick={() => onNavigate('raw_materials')} />
            <MenuCard label="Product Stock" color="purple" icon="📦" onClick={() => onNavigate('stock')} />
            <MenuCard label="Expenses" color="red" icon="💸" onClick={() => onNavigate('expense')} />
            
            {/* Reports */}
            <MenuCard label="Analytics" color="blue" icon="📈" onClick={() => onNavigate('analytics')} />
            <MenuCard label="Wastage" color="gray" icon="🗑️" onClick={() => onNavigate('wastage')} />
            
            {/* Partners */}
            <MenuCard label="Suppliers" color="orange" icon="🚛" onClick={() => onNavigate('suppliers')} />
            
            {/* System */}
            <MenuCard label="Audit Logs" color="blackAlpha" icon="🛡️" onClick={() => onNavigate('audit')} />

          </SimpleGrid>
        </>
      )}
    </Box>
  )
}

// 🎨 Helper Component for Menu Cards
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