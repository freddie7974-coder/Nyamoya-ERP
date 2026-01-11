// src/App.jsx
import { useState, useEffect } from 'react'
import { ChakraProvider, Box, Container, Spinner, Center } from '@chakra-ui/react' 
import { onAuthStateChanged } from 'firebase/auth'
import { auth, db } from './firebase'
import { doc, getDoc } from 'firebase/firestore'

// 👇 AUTH & DASHBOARD
import LoginScreen from './components/LoginScreen'
import DashboardScreen from './components/DashboardScreen' 
import NetworkStatus from './components/NetworkStatus' 

// 👇 OPERATIONAL SCREENS
import SalesScreen from './components/SalesScreen'
import ProductionScreen from './components/ProductionScreen'
import DeliveryScreen from './components/DeliveryScreen'
import HRScreen from './components/HRScreen' 

// 👇 ADMIN SCREENS
import StockScreen from './components/StockScreen'
import ExpensesScreen from './components/ExpensesScreen' 
import CashBookScreen from './components/CashBookScreen'
import RestockScreen from './components/RestockScreen'
import AnalyticsScreen from './components/AnalyticsScreen'
import RawMaterialScreen from './components/RawMaterialScreen'
import DataExportScreen from './components/DataExportScreen' 
import AuditLogScreen from './components/AuditLogScreen'
import BalanceSheetScreen from './components/BalanceSheetScreen'
import MonthlyReportScreen from './components/MonthlyReportScreen'
import SystemToolsScreen from './components/SystemToolsScreen'
import WastageScreen from './components/WastageScreen'
import SuppliersScreen from './components/SuppliersScreen' 

function App() {
  const [user, setUser] = useState(null)
  const [userRole, setUserRole] = useState(null)
  const [currentScreen, setCurrentScreen] = useState('dashboard')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        // 👇 ADMIN OVERRIDE FOR THE OWNER
        if (currentUser.email === 'freddie7974@gmail.com') {
           setUserRole('admin');
        } else {
           const docRef = doc(db, 'users', currentUser.uid)
           const docSnap = await getDoc(docRef)
           if (docSnap.exists()) {
             setUserRole(docSnap.data().role)
           } else {
             setUserRole('staff') 
           }
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

  const handleLogin = () => setCurrentScreen('dashboard')
  
  const handleLogout = () => {
    setUser(null)
    setUserRole(null)
    setCurrentScreen('login')
  }

  if (loading) {
    return (
      <ChakraProvider>
        <Center h="100vh"><Spinner size="xl" color="teal.500" /></Center>
      </ChakraProvider>
    )
  }

  if (!user) {
    return (
      <ChakraProvider>
        <LoginScreen onLogin={handleLogin} />
      </ChakraProvider>
    )
  }

  return (
    <ChakraProvider>
      <NetworkStatus /> 

      <Box minH="100vh" bg="gray.50">
        <Container maxW="container.xl" p={4} mx="auto" minH="100vh">
          
          {currentScreen === 'dashboard' && (
            <DashboardScreen 
              userRole={userRole} 
              onNavigate={setCurrentScreen} 
              onLogout={handleLogout} 
            />
          )}
          
          {currentScreen === 'sales' && <SalesScreen onBack={() => setCurrentScreen('dashboard')} />}
          {currentScreen === 'production' && <ProductionScreen onBack={() => setCurrentScreen('dashboard')} />}
          {currentScreen === 'delivery' && <DeliveryScreen onBack={() => setCurrentScreen('dashboard')} />}
          
          {userRole === 'admin' && currentScreen === 'hr' && <HRScreen onBack={() => setCurrentScreen('dashboard')} />}

          {userRole === 'admin' && (
            <>
              {currentScreen === 'stock' && <StockScreen onBack={() => setCurrentScreen('dashboard')} />}
              
              {(currentScreen === 'expense' || currentScreen === 'expenses') && (
                  <ExpensesScreen onBack={() => setCurrentScreen('dashboard')} />
              )}
              
              {(currentScreen === 'raw_materials' || currentScreen === 'raw_material') && (
                  <RawMaterialScreen onBack={() => setCurrentScreen('dashboard')} />
              )}

              {currentScreen === 'restock' && <RestockScreen onBack={() => setCurrentScreen('dashboard')} />}
              
              {(currentScreen === 'supplier' || currentScreen === 'suppliers') && (
                   <SuppliersScreen onBack={() => setCurrentScreen('dashboard')} />
              )}
              
              {currentScreen === 'monthly_report' && <MonthlyReportScreen onBack={() => setCurrentScreen('dashboard')} />}
              {currentScreen === 'system_tools' && <SystemToolsScreen onBack={() => setCurrentScreen('dashboard')} />}
              {currentScreen === 'wastage' && <WastageScreen onBack={() => setCurrentScreen('dashboard')} />}
              {currentScreen === 'cashbook' && <CashBookScreen onBack={() => setCurrentScreen('dashboard')} />}
              {currentScreen === 'analytics' && <AnalyticsScreen onBack={() => setCurrentScreen('dashboard')} />}
              {currentScreen === 'export' && <DataExportScreen onBack={() => setCurrentScreen('dashboard')} />}
              {currentScreen === 'audit' && <AuditLogScreen onBack={() => setCurrentScreen('dashboard')} />}
              {currentScreen === 'balance_sheet' && <BalanceSheetScreen onBack={() => setCurrentScreen('dashboard')} />}
            </>
          )}

        </Container>
      </Box>
    </ChakraProvider>
  )
}

export default App