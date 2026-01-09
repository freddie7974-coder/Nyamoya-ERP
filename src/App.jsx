// src/App.jsx
import { useState, useEffect } from 'react'
import { ChakraProvider, Box, Container, Spinner, Center } from '@chakra-ui/react' 
import { onAuthStateChanged } from 'firebase/auth'
import { auth, db } from './firebase'
import { doc, getDoc } from 'firebase/firestore'

// 👇 AUTH & DASHBOARD
import LoginScreen from './components/LoginScreen'
import DashboardScreen from './components/DashboardScreen' // ✅ Matches your file name
import NetworkStatus from './components/NetworkStatus' 

// 👇 OPERATIONAL SCREENS
import SalesScreen from './components/SalesScreen'
import ProductionScreen from './components/ProductionScreen'
import DeliveryScreen from './components/DeliveryScreen'
import HRScreen from './components/HRScreen' 
import CustomerScreen from './components/CustomerScreen'
import SupplierScreen from './components/SupplierScreen'
import WastageScreen from './components/WastageScreen'

// 👇 ADMIN SCREENS
import StockScreen from './components/StockScreen'
import ExpenseScreen from './components/ExpenseScreen' // ✅ Singular Import (Matches the file we fixed)
import CashBookScreen from './components/CashBookScreen'
import RestockScreen from './components/RestockScreen'
import AnalyticsScreen from './components/AnalyticsScreen'
import RawMaterialScreen from './components/RawMaterialScreen'
import DataExportScreen from './components/DataExportScreen' 
import AuditLogScreen from './components/AuditLogScreen'
import BalanceSheetScreen from './components/BalanceSheetScreen'
import MonthlyReportScreen from './components/MonthlyReportScreen'
import SystemToolsScreen from './components/SystemToolsScreen'

function App() {
  const [user, setUser] = useState(null)
  const [userRole, setUserRole] = useState(null)
  const [currentScreen, setCurrentScreen] = useState('dashboard')
  const [loading, setLoading] = useState(true)

  // 1. FIREBASE AUTH CHECK
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        // Fetch Role from Database
        const docRef = doc(db, 'users', currentUser.uid)
        const docSnap = await getDoc(docRef)
        if (docSnap.exists()) {
          setUserRole(docSnap.data().role)
        } else {
          setUserRole('staff') // Default fallback
        }
        setUser(currentUser)
      } else {
        setUser(null)
        setUserRole(null)
      }
      setLoading(false)
    })
    return () => unsubscribe()
  }, [])

  // 2. Navigation Handlers
  const handleLogin = () => setCurrentScreen('dashboard')
  
  const handleLogout = () => {
    setUser(null)
    setUserRole(null)
    setCurrentScreen('login')
  }

  // 3. Loading State
  if (loading) {
    return (
      <ChakraProvider>
        <Center h="100vh"><Spinner size="xl" color="teal.500" /></Center>
      </ChakraProvider>
    )
  }

  // 4. Show Login if not authenticated
  if (!user) {
    return (
      <ChakraProvider>
        <LoginScreen onLogin={handleLogin} />
      </ChakraProvider>
    )
  }

  // 5. MAIN APP RENDER
  return (
    <ChakraProvider>
      {/* 📡 OFFLINE BADGE */}
      <NetworkStatus /> 

      <Box minH="100vh" bg="gray.50">
        <Container maxW="container.xl" p={4} mx="auto" minH="100vh">
          
          {/* DASHBOARD */}
          {currentScreen === 'dashboard' && (
            <DashboardScreen 
              userRole={userRole} 
              onNavigate={setCurrentScreen} 
              onLogout={handleLogout} 
            />
          )}
          
          {/* OPERATIONAL SCREENS */}
          {/* ✅ FIX #1: 'sales' (Plural) to match Dashboard button */}
          {currentScreen === 'sales' && <SalesScreen onBack={() => setCurrentScreen('dashboard')} />}
          
          {currentScreen === 'production' && <ProductionScreen onBack={() => setCurrentScreen('dashboard')} />}
          {currentScreen === 'delivery' && <DeliveryScreen onBack={() => setCurrentScreen('dashboard')} />}

          {/* ADMIN ONLY SCREENS */}
          {userRole === 'admin' && (
            <>
              {currentScreen === 'stock' && <StockScreen onBack={() => setCurrentScreen('dashboard')} />}
              
              {/* ✅ FIX #2: 'expenses' (Plural) to match Dashboard button */}
              {(currentScreen === 'expense' || currentScreen === 'expenses') && (
                  <ExpenseScreen onBack={() => setCurrentScreen('dashboard')} />
              )}
              
              {currentScreen === 'cashbook' && <CashBookScreen onBack={() => setCurrentScreen('dashboard')} />}
              {currentScreen === 'restock' && <RestockScreen onBack={() => setCurrentScreen('dashboard')} />}
              {currentScreen === 'analytics' && <AnalyticsScreen onBack={() => setCurrentScreen('dashboard')} />}
              {currentScreen === 'raw_materials' && <RawMaterialScreen onBack={() => setCurrentScreen('dashboard')} />}
              {currentScreen === 'hr' && <HRScreen onBack={() => setCurrentScreen('dashboard')} />}
              {currentScreen === 'export' && <DataExportScreen onBack={() => setCurrentScreen('dashboard')} />}
              {currentScreen === 'audit' && <AuditLogScreen onBack={() => setCurrentScreen('dashboard')} />}
              {currentScreen === 'customers' && <CustomerScreen onBack={() => setCurrentScreen('dashboard')} />}
              {currentScreen === 'suppliers' && <SupplierScreen onBack={() => setCurrentScreen('dashboard')} />}
              {currentScreen === 'wastage' && <WastageScreen onBack={() => setCurrentScreen('dashboard')} />}
              {currentScreen === 'balance_sheet' && <BalanceSheetScreen onBack={() => setCurrentScreen('dashboard')} />}
              {currentScreen === 'monthly_report' && <MonthlyReportScreen onBack={() => setCurrentScreen('dashboard')} />}
              {currentScreen === 'system_tools' && <SystemToolsScreen onBack={() => setCurrentScreen('dashboard')} />}
            </>
          )}

        </Container>
      </Box>
    </ChakraProvider>
  )
}

export default App