import React, { useState } from 'react';
import { View, Text, TextInput, Button, Alert } from 'react-native';
import { supabase } from '../lib/supabaseClient';

export default function RegisterScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSignUp = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please enter both email and password.");
      return;
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      Alert.alert("Error", error.message);
    } else {
      Alert.alert("Success", "Account created! You can now log in.");
      navigation.replace("Login");
    }
  };

  return (
    <View style={{ flex:1, padding:20, justifyContent:'center' }}>
      <Text style={{ fontSize:24, fontWeight:'bold', marginBottom:20 }}>Register</Text>

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

      <Button title="Create Account" onPress={handleSignUp} />
    </View>
  );
}
