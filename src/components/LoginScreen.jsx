// src/components/LoginScreen.jsx
import { useState } from 'react'
import { Box, Button, Input, VStack, Heading, Text, useToast, Container, FormControl, FormLabel, Spinner } from '@chakra-ui/react'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { auth } from '../firebase'

export default function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const toast = useToast()

  const handleLogin = async (e) => {
    e.preventDefault() // Stop page refresh
    if (!email || !password) {
      toast({ title: "Please enter email and password", status: "warning" })
      return
    }

    setLoading(true)
    try {
      // 1. Talk to Firebase Auth 🔒
      const userCredential = await signInWithEmailAndPassword(auth, email, password)
      const user = userCredential.user

      // 2. Determine Role
      // Simple logic: If it's YOUR email, you are Admin. Everyone else is Staff.
      // (Change 'admin@nyamoya.com' to whatever email you created in Step 1)
      const role = user.email === 'admin@nyamoya.com' ? 'admin' : 'staff'

      toast({ title: "Welcome back!", status: "success" })
      
      // 3. Pass control to App.jsx
      onLogin(role)

    } catch (error) {
      console.error(error)
      let msg = "Login failed."
      if (error.code === 'auth/invalid-credential') msg = "Wrong email or password."
      if (error.code === 'auth/too-many-requests') msg = "Too many failed attempts. Try later."
      
      toast({ title: "Access Denied", description: msg, status: "error" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box h="100vh" bg="gray.100" display="flex" alignItems="center" justifyContent="center">
      <Container maxW="sm" bg="white" p={8} borderRadius="xl" shadow="lg">
        <VStack spacing={6}>
          <Heading color="teal.600">Nyamoya ERP 🏭</Heading>
          <Text color="gray.500">Secure Enterprise Login</Text>
          
          <form onSubmit={handleLogin} style={{ width: '100%' }}>
            <VStack spacing={4}>
              <FormControl>
                <FormLabel>Email Address</FormLabel>
                <Input 
                  type="email" 
                  placeholder="admin@nyamoya.com" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)}
                  autoFocus
                />
              </FormControl>

              <FormControl>
                <FormLabel>Password</FormLabel>
                <Input 
                  type="password" 
                  placeholder="••••••" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                />
              </FormControl>

              <Button 
                type="submit" 
                colorScheme="teal" 
                w="100%" 
                isLoading={loading}
                loadingText="Verifying..."
              >
                Login
              </Button>
            </VStack>
          </form>

          <Text fontSize="xs" color="gray.400">
            Forgot password? Contact System Administrator.
          </Text>
        </VStack>
      </Container>
    </Box>
  )
}