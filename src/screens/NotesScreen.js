import React, { useState, useEffect, useRef } from 'react';
import { 
  View, Text, TextInput, FlatList, Image, Alert, StyleSheet, 
  TouchableOpacity, ScrollView, Animated, KeyboardAvoidingView, Platform, SafeAreaView, Dimensions
} from 'react-native';
import { supabase } from '../lib/supabaseClient';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import * as FileSystem from 'expo-file-system';
import { Buffer } from 'buffer';
import { decode } from 'base64-arraybuffer';

export default function NotesScreen({ navigation }) {
  const [notes, setNotes] = useState([]);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [mediaPath, setMediaPath] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [creatingNote, setCreatingNote] = useState(false);

  const formTranslateY = useRef(new Animated.Value(400)).current;
  const plusRotate = useRef(new Animated.Value(0)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current; // new opacity control

  const screenHeight = Dimensions.get('window').height;
  const logoutBottom = screenHeight * 0.08; // responsive logout button
  const fabBottom = logoutBottom + 80; // FAB above logout
  const modalBottom = fabBottom + 60; // modal above FAB

  useEffect(() => {
    fetchNotes();
  }, []);

  const rotate = plusRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '45deg'],
  });

  useEffect(() => {
    if (creatingNote) {
      // Animate modal and overlay in
      Animated.parallel([
        Animated.timing(formTranslateY, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(plusRotate, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [creatingNote]);

  const closeModal = () => {
    // Animate modal and overlay out
    Animated.parallel([
      Animated.timing(formTranslateY, {
        toValue: 400,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(plusRotate, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setCreatingNote(false); // fully hide modal after animation
    });
  };

  const getCurrentUser = async () => {
    const { data } = await supabase.auth.getUser();
    const user = data?.user;
    if (user) setCurrentUser(user);
    return user;
  };

  const fetchNotes = async () => {
    const user = await getCurrentUser();
    if (!user) {
      navigation.replace('Login');
      return;
    }

    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .eq('user_id', user.id)
      .order('id', { ascending: false });

    if (!error) setNotes(data);
  };

  const pickMedia = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled) {
      const fileUri = result.assets[0].uri;
      uploadMedia(fileUri);
    }
  };

    const uploadMedia = async (uri) => {
  try {
    const user = await getCurrentUser();
    if (!user) return;

    // 1. Get filename and extension
    const filename = uri.split('/').pop();
    const ext = filename.split('.').pop().toLowerCase();

    // 2. Determine content type
    let contentType = 'application/octet-stream';
    if (['jpg', 'jpeg'].includes(ext)) contentType = 'image/jpeg';
    else if (ext === 'png') contentType = 'image/png';
    else if (ext === 'mp4') contentType = 'video/mp4';
    else if (ext === 'mov') contentType = 'video/quicktime';

    // 3. Read local file as base64 (FileSystem handles 'file://' URIs)
    const base64File = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    if (!base64File) {
      throw new Error('Could not read file as base64');
    }

    // 4. Convert base64 to ArrayBuffer
    const arrayBuffer = decode(base64File);

    // 5. Upload to Supabase
    const { data, error } = await supabase.storage
      .from('notes-media')
      .upload(`${user.id}/${Date.now()}-${filename}`, arrayBuffer, {
        contentType,
        upsert: true,
      });

    if (error) throw error;

    setMediaPath(data.path);
    Alert.alert('Success', 'Media uploaded!');
  } catch (error) {
    console.log('UPLOAD ERROR:', error);
    Alert.alert('Upload failed', error.message);
  }
};

  const createNote = async () => {
    if (!title && !body && !mediaPath) {
      Alert.alert('Error', 'Please add a title, body, or media.');
      return;
    }

    const user = await getCurrentUser();
    if (!user) return;

    const { error } = await supabase
      .from('notes')
      .insert([{ title, body, media: mediaPath, user_id: user.id }]);

    if (error) Alert.alert('Error', error.message);
    else {
      setTitle('');
      setBody('');
      setMediaPath('');
      closeModal(); // animate close modal
      fetchNotes();
    }
  };

  const deleteNote = async (id) => {
    const { error } = await supabase.from('notes').delete().eq('id', id);
    if (error) Alert.alert('Error', error.message);
    else fetchNotes();
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) Alert.alert('Error', error.message);
    else navigation.replace('Login');
  };

  const renderNoteCard = ({ item }) => (
    <LinearGradient colors={['#ffffff', '#f9f9f9']} style={styles.noteCard}>
      <Text style={styles.noteTitle}>{item.title}</Text>
      <Text>{item.body}</Text>
      {item.media && (
        <Image
          source={{ uri: supabase.storage.from('notes-media').getPublicUrl(item.media).data.publicUrl }}
          style={styles.noteImage}
        />
      )}
      <TouchableOpacity 
        style={[styles.button, { backgroundColor: '#f44336', marginTop: 10 }]} 
        onPress={() => deleteNote(item.id)}
      >
        <Text style={styles.buttonText}>Delete</Text>
      </TouchableOpacity>
    </LinearGradient>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <View style={{ flex: 1 }}>
        <FlatList
          data={notes}
          keyExtractor={(item) => item.id.toString()}
          ListHeaderComponent={
            <View style={{ marginBottom: 20 }}>
              <Text style={styles.heading}>
                Welcome, {currentUser?.email || 'Loading...'}
              </Text>
              <Text style={styles.subheading}>Your Notes</Text>
            </View>
          }
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: fabBottom + 40 }}
          renderItem={renderNoteCard}
        />

        {/* Floating + button */}
        <TouchableOpacity
          style={[styles.fab, { bottom: fabBottom }]}
          onPress={() => {
            if (creatingNote) closeModal();
            else setCreatingNote(true);
          }}
        >
          <Animated.Text style={{ fontSize: 30, color: '#fff', transform: [{ rotate }] }}>+</Animated.Text>
        </TouchableOpacity>

        {/* Overlay */}
        <Animated.View
          pointerEvents={creatingNote ? 'auto' : 'none'} // <--- important fix
          style={[styles.overlay, { opacity: overlayOpacity }]}
        >
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={closeModal}
          />
        </Animated.View>

        {/* Create Note Modal */}
        {creatingNote && (
          <Animated.View
            style={[
              styles.createNoteContainer,
              {
                bottom: modalBottom,
                transform: [{ translateY: formTranslateY }],
              },
            ]}
          >
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={{ flex: 1 }}
            >
              <ScrollView keyboardShouldPersistTaps="handled">
                <TextInput
                  placeholder="Title"
                  value={title}
                  onChangeText={setTitle}
                  style={styles.input}
                />
                <TextInput
                  placeholder="Body"
                  value={body}
                  onChangeText={setBody}
                  style={[styles.input, { height: 80 }]}
                  multiline
                />
                <TouchableOpacity style={styles.button} onPress={pickMedia}>
                  <Text style={styles.buttonText}>Pick Image/Video</Text>
                </TouchableOpacity>
                {mediaPath && <Text style={{ textAlign: 'center', marginVertical: 5 }}>Media ready!</Text>}
                <TouchableOpacity
                  style={[styles.button, { backgroundColor: '#4CAF50', marginTop: 10 }]}
                  onPress={createNote}
                >
                  <Text style={styles.buttonText}>Add Note</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, { backgroundColor: '#888', marginTop: 10 }]}
                  onPress={closeModal}
                >
                  <Text style={styles.buttonText}>Cancel</Text>
                </TouchableOpacity>
              </ScrollView>
            </KeyboardAvoidingView>
          </Animated.View>
        )}

        {/* Logout button at bottom */}
        <TouchableOpacity style={[styles.logoutButton, { bottom: logoutBottom }]} onPress={handleLogout}>
          <Text style={styles.buttonText}>Logout</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  heading: { fontSize: 26, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  subheading: { fontSize: 20, fontWeight: 'bold', marginTop: 20, marginBottom: 10 },
  input: { 
    borderWidth: 1, borderColor: '#ccc', padding: 12, marginBottom: 10, 
    borderRadius: 12, backgroundColor: '#f2f2f2' 
  },
  button: { 
    backgroundColor: '#2196F3', 
    paddingVertical: 12, 
    borderRadius: 12, 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  noteCard: { 
    borderRadius: 12, 
    padding: 15, 
    marginVertical: 8, 
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 4,
  },
  noteTitle: { fontWeight: 'bold', marginBottom: 5, fontSize: 16 },
  noteImage: { width: '95%', height: 200, marginTop: 10, alignSelf: 'center', borderRadius: 12 },
  fab: {
    position: 'absolute',
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#2196F3',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    zIndex: 10,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    zIndex: 1,
  },
  createNoteContainer: { 
    position: 'absolute', 
    left: 20, 
    right: 20, 
    backgroundColor: '#fff', 
    borderRadius: 12, 
    padding: 20, 
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 6,
    maxHeight: '70%',
    zIndex: 2,
  },
  logoutButton: {
    position: 'absolute',
    left: 20,
    right: 20,
    backgroundColor: '#f44336',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
  },
});
