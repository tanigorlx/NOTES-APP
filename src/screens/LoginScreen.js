import React, { useState } from 'react';
import { View, Text, TextInput, Button, Alert, TouchableOpacity } from 'react-native';
import { supabase } from '../lib/supabaseClient';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSignIn = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please enter both email and password.");
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      Alert.alert("Error", error.message);
    } else {
      navigation.replace("Notes");
    }
  };

  return (
    <View style={{ flex:1, padding:20, justifyContent:'center' }}>
      <Text style={{ fontSize:24, fontWeight:'bold', marginBottom:20 }}>Login</Text>

      <Text>Email</Text>
      <TextInput
        style={{ borderWidth:1, padding:10, marginBottom:10 }}
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
      />

      <Text>Password</Text>
      <TextInput
        style={{ borderWidth:1, padding:10, marginBottom:10 }}
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      <Button title="Sign In" onPress={handleSignIn} />

      <TouchableOpacity onPress={() => navigation.navigate("Register")}>
        <Text style={{ marginTop:20, color:'blue', textAlign:'center' }}>
          Don't have an account? Register here
        </Text>
      </TouchableOpacity>
    </View>
  );
}
