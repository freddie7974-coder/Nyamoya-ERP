// src/components/LoginScreen.jsx
import { useState } from 'react'
import { Box, Button, Input, VStack, Heading, Text, useToast, Container, FormControl, FormLabel, Divider, AbsoluteCenter, Center } from '@chakra-ui/react'
import { signInWithPopup, signInWithEmailAndPassword, signOut } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, googleProvider, db } from '../firebase'

export default function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const toast = useToast()

  // 🛡️ SUPER ADMIN FALLBACK
  const ADMIN_EMAIL = "freddie7974@gmail.com" 

  // 🧠 SHARED LOGIC: Checks database for ANY user (Google or Password)
  const checkUserAccess = async (user) => {
    const userEmail = user.email.toLowerCase()

    // 1. Check Super Admin
    if (userEmail === ADMIN_EMAIL.toLowerCase()) {
      toast({ title: `Welcome Boss! 👑`, status: "success" })
      onLogin('admin')
      return
    }

    // 2. Check HR Database
    const docRef = doc(db, "allowed_users", userEmail)
    const docSnap = await getDoc(docRef)

    if (docSnap.exists()) {
      const userData = docSnap.data()
      const userRole = userData.role || 'staff'
      toast({ title: `Welcome ${userData.name}`, description: `Logged in as ${userRole.toUpperCase()}`, status: "success" })
      onLogin(userRole)
    } else {
      await signOut(auth) // Kick them out
      toast({ 
        title: "Access Denied 🚫", 
        description: "You are not an authorized employee. Contact HR.", 
        status: "error",
        duration: 5000,
        isClosable: true
      })
    }
  }

  // 🔵 METHOD 1: Google Login
  const handleGoogleLogin = async () => {
    setLoading(true)
    try {
      const result = await signInWithPopup(auth, googleProvider)
      await checkUserAccess(result.user)
    } catch (error) {
      console.error(error)
      toast({ title: "Google Login Failed", description: error.message, status: "error" })
    } finally {
      setLoading(false)
    }
  }

  // 🟢 METHOD 2: Email/Password Login
  const handlePasswordLogin = async (e) => {
    e.preventDefault()
    if (!email || !password) {
      toast({ title: "Please enter email and password", status: "warning" })
      return
    }
    setLoading(true)
    try {
      const result = await signInWithEmailAndPassword(auth, email, password)
      await checkUserAccess(result.user)
    } catch (error) {
      console.error(error)
      let msg = "Login failed."
      if (error.code === 'auth/invalid-credential') msg = "Wrong email or password."
      toast({ title: "Error", description: msg, status: "error" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box h="100vh" bg="gray.100" display="flex" alignItems="center" justifyContent="center">
      <Container maxW="sm" bg="white" p={8} borderRadius="xl" shadow="lg">
        <VStack spacing={6}>
          <Box textAlign="center">
            <Heading size="lg" color="teal.600">Nyamoya ERP</Heading>
            <Text color="gray.500" fontSize="sm">Secure Enterprise Login</Text>
          </Box>
          
          {/* METHOD 1: EMAIL FORM */}
          <form onSubmit={handlePasswordLogin} style={{ width: '100%' }}>
            <VStack spacing={4}>
              <FormControl>
                <FormLabel fontSize="sm">Email Address</FormLabel>
                <Input 
                  type="email" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)}
                />
              </FormControl>

              <FormControl>
                <FormLabel fontSize="sm">Password</FormLabel>
                <Input 
                  type="password" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                />
              </FormControl>

              <Button type="submit" colorScheme="teal" w="100%" isLoading={loading}>
                Login
              </Button>
            </VStack>
          </form>

          {/* DIVIDER */}
          <Box position='relative' w="100%" py={2}>
            <Divider />
            <AbsoluteCenter bg='white' px='4' fontSize="sm" color="gray.500">
              OR
            </AbsoluteCenter>
          </Box>

          {/* METHOD 2: GOOGLE */}
          <Button 
            w="100%" 
            variant="outline" 
            colorScheme="blue" 
            onClick={handleGoogleLogin}
            isLoading={loading}
            leftIcon={<Text fontWeight="bold">G</Text>}
          >
            Sign in with Google
          </Button>

        </VStack>
      </Container>
    </Box>
  )
}