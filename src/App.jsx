// src/App.jsx
import { useState, useEffect } from 'react'
import { ChakraProvider, Box, Button } from '@chakra-ui/react'

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
import DataExportScreen from './components/DataExportScreen' // 👈 THIS WAS MISSING!
import AuditLogScreen from './components/AuditLogScreen.jsx' 


function App() {
  const [userRole, setUserRole] = useState(null)
  const [currentScreen, setCurrentScreen] = useState('dashboard')

  useEffect(() => {
    const savedRole = localStorage.getItem('nyamoya_role')
    if (savedRole) setUserRole(savedRole)
  }, [])

  const handleLogin = (role) => {
    setUserRole(role)
    localStorage.setItem('nyamoya_role', role)
  }

  const handleLogout = () => {
    setUserRole(null)
    localStorage.removeItem('nyamoya_role')
    setCurrentScreen('dashboard')
  }

  if (!userRole) {
    return (
      <ChakraProvider>
        <LoginScreen onLogin={handleLogin} />
      </ChakraProvider>
    )
  }

  return (
    <ChakraProvider>
      <Box minH="100vh" bg="gray.50">
        <Box position="absolute" top="0" right="0" p={2} zIndex={10}>
          <Button size="xs" colorScheme="red" variant="outline" onClick={handleLogout}>
            Logout 🔒
          </Button>
        </Box>

        {currentScreen === 'dashboard' && (
          <Dashboard userRole={userRole} onNavigate={(screen) => setCurrentScreen(screen)} />
        )}
        
        {currentScreen === 'sale' && <SalesScreen onBack={() => setCurrentScreen('dashboard')} />}
        {currentScreen === 'production' && <ProductionScreen onBack={() => setCurrentScreen('dashboard')} />}
        {currentScreen === 'delivery' && <DeliveryScreen onBack={() => setCurrentScreen('dashboard')} />}

        {/* ADMIN ONLY */}
        {userRole === 'admin' && (
          <>
            {currentScreen === 'stock' && <StockScreen onBack={() => setCurrentScreen('dashboard')} />}
            {currentScreen === 'expense' && <ExpensesScreen onBack={() => setCurrentScreen('dashboard')} />}
            {currentScreen === 'cashbook' && <CashBookScreen onBack={() => setCurrentScreen('dashboard')} />}
            {currentScreen === 'restock' && <RestockScreen onBack={() => setCurrentScreen('dashboard')} />}
            {currentScreen === 'analytics' && <AnalyticsScreen onBack={() => setCurrentScreen('dashboard')} />}
            {currentScreen === 'raw_materials' && <RawMaterialScreen onBack={() => setCurrentScreen('dashboard')} />}
            {currentScreen === 'hr' && <HRScreen onBack={() => setCurrentScreen('dashboard')} />}
            
            {/* 👇 This logic needs the import above to work */}
            {currentScreen === 'export' && <DataExportScreen onBack={() => setCurrentScreen('dashboard')} />}
            {currentScreen === 'audit' && <AuditLogScreen onBack={() => setCurrentScreen('dashboard')} />}
            {currentScreen === 'customers' && <CustomerScreen onBack={() => setCurrentScreen('dashboard')} />}
            {currentScreen === 'suppliers' && <SupplierScreen onBack={() => setCurrentScreen('dashboard')} />}
            {currentScreen === 'wastage' && <WastageScreen onBack={() => setCurrentScreen('dashboard')} />}
          </>
        )}
      </Box>
    </ChakraProvider>
  )
}

export default App