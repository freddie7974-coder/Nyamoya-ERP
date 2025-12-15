// src/App.jsx
import { useState, useEffect } from 'react'
import { ChakraProvider, Box, Container } from '@chakra-ui/react' // 👈 Added Container

// 👇 IMPORTS
import LoginScreen from './components/LoginScreen'
import Dashboard from './components/Dashboard'
import SalesScreen from './components/SalesScreen'
import ProductionScreen from './components/ProductionScreen'
import DeliveryScreen from './components/DeliveryScreen'
import HRScreen from './components/HRScreen' 
import CustomerScreen from './components/CustomerScreen'
import SupplierScreen from './components/SupplierScreen'
import WastageScreen from './components/WastageScreen'

// Admin Screens
import StockScreen from './components/StockScreen'
import ExpensesScreen from './components/ExpensesScreen'
import CashBookScreen from './components/CashBookScreen'
import RestockScreen from './components/RestockScreen'
import AnalyticsScreen from './components/AnalyticsScreen'
import RawMaterialScreen from './components/RawMaterialScreen'
import DataExportScreen from './components/DataExportScreen' 
import AuditLogScreen from './components/AuditLogScreen' 

function App() {
  const [userRole, setUserRole] = useState(null)
  const [currentScreen, setCurrentScreen] = useState('dashboard')

  // 1. Check if already logged in
  useEffect(() => {
    const savedRole = localStorage.getItem('nyamoya_role')
    if (savedRole) setUserRole(savedRole)
  }, [])

  // 2. Login Handler
  const handleLogin = (role) => {
    setUserRole(role)
    localStorage.setItem('nyamoya_role', role)
  }

  // 3. Logout Handler
  const handleLogout = () => {
    setUserRole(null)
    localStorage.removeItem('nyamoya_role')
    setCurrentScreen('dashboard')
  }

  // 4. Show Login if no user
  if (!userRole) {
    return (
      <ChakraProvider>
        <LoginScreen onLogin={handleLogin} />
      </ChakraProvider>
    )
  }

  return (
    <ChakraProvider>
      {/* ✨ THE FIX: 
         1. Box bg="gray.50": Keeps the full background gray.
         2. Container: Centers the content and limits width on laptops.
      */}
      <Box minH="100vh" bg="gray.50">
        <Container maxW="container.xl" p={0} minH="100vh">
          
          {/* DASHBOARD */}
          {currentScreen === 'dashboard' && (
            <Dashboard 
              userRole={userRole} 
              onNavigate={setCurrentScreen} 
              onLogout={handleLogout} 
            />
          )}
          
          {/* OPERATIONAL SCREENS */}
          {currentScreen === 'sale' && <SalesScreen onBack={() => setCurrentScreen('dashboard')} />}
          {currentScreen === 'production' && <ProductionScreen onBack={() => setCurrentScreen('dashboard')} />}
          {currentScreen === 'delivery' && <DeliveryScreen onBack={() => setCurrentScreen('dashboard')} />}

          {/* ADMIN ONLY SCREENS */}
          {userRole === 'admin' && (
            <>
              {currentScreen === 'stock' && <StockScreen onBack={() => setCurrentScreen('dashboard')} />}
              {currentScreen === 'expense' && <ExpensesScreen onBack={() => setCurrentScreen('dashboard')} />}
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
            </>
          )}

        </Container>
      </Box>
    </ChakraProvider>
  )
}

export default App