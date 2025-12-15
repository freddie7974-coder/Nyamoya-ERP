// src/components/LoginScreen.jsx
import { useState } from 'react'
import { Box, Button, VStack, Heading, Text, useToast, Container, Center } from '@chakra-ui/react'
import { signInWithPopup, signOut } from 'firebase/auth' // 👈 Added signOut
import { doc, getDoc } from 'firebase/firestore'
import { auth, googleProvider, db } from '../firebase' // 👈 Added db

export default function LoginScreen({ onLogin }) {
  const [loading, setLoading] = useState(false)
  const toast = useToast()

  // 🛡️ SUPER ADMIN (The Fallback)
  const ADMIN_EMAIL = "freddie7974@gmail.com" 

  const handleGoogleLogin = async () => {
    setLoading(true)
    try {
      // 1. Google Login Window
      const result = await signInWithPopup(auth, googleProvider)
      const user = result.user
      const userEmail = user.email.toLowerCase() // Always use lowercase for matching

      // 2. CHECK: Is this YOU (The Super Admin)?
      if (userEmail === ADMIN_EMAIL.toLowerCase()) {
        toast({ title: `Welcome Boss! 👑`, status: "success" })
        onLogin('admin')
        return // Stop here, you are in!
      }

      // 3. CHECK: Is this user in the "Allowed List" in Database?
      // We look for a document where the ID is the email address
      const docRef = doc(db, "allowed_users", userEmail)
      const docSnap = await getDoc(docRef)

      if (docSnap.exists()) {
        // ✅ USER FOUND!
        const userData = docSnap.data()
        const userRole = userData.role || 'staff' // Default to staff if role missing
        
        toast({ title: `Welcome ${userData.name}`, description: `Logged in as ${userRole.toUpperCase()}`, status: "success" })
        onLogin(userRole)
      } else {
        // ⛔ USER NOT FOUND -> KICK THEM OUT
        await signOut(auth) // Log them out of Firebase immediately
        
        toast({ 
          title: "Access Denied 🚫", 
          description: "You are not an authorized employee. Contact HR.", 
          status: "error",
          duration: 5000,
          isClosable: true
        })
      }

    } catch (error) {
      console.error(error)
      toast({ title: "Login Failed", description: error.message, status: "error" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box h="100vh" bgGradient="linear(to-br, teal.500, blue.600)" display="flex" alignItems="center" justifyContent="center">
      <Container maxW="sm" bg="white" p={10} borderRadius="2xl" shadow="2xl" textAlign="center">
        <VStack spacing={8}>
          
          <Box>
            <Heading size="xl" color="gray.800" mb={2}>Nyamoya ERP</Heading>
            <Text color="gray.500" fontSize="lg">Enterprise Login</Text>
          </Box>

          <Center w="100%">
            <Button 
              w="100%" 
              h="60px"
              variant="outline" 
              colorScheme="blue"
              isLoading={loading}
              loadingText="Verifying Access..."
              onClick={handleGoogleLogin}
              leftIcon={<Text fontSize="2xl">G</Text>}
              _hover={{ bg: 'blue.50', transform: 'scale(1.02)' }}
              transition="all 0.2s"
              fontSize="lg"
            >
              Sign in with Google
            </Button>
          </Center>

          <Text fontSize="xs" color="gray.400">
            Authorized Personnel Only
          </Text>
        </VStack>
      </Container>
    </Box>
  )
}