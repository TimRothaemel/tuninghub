// Supabase initialisieren (ersetze durch deinen echten anon key)
const supabase = window.supabase.createClient(
  'https://yvdptnkmgfxkrszitweo.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl2ZHB0bmttZ2Z4a3Jzeml0d2VvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA3MDAwMzQsImV4cCI6MjA2NjI3NjAzNH0.Kd6D6IQ_stUMrcbm2TN-7ACjFJvXNmkeNehQHavTmJo', // <-- HIER dein echter Anon-Key
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  }
);

// Nutzerprüfung
async function getCurrentUser() {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error || !session || !session.user) {
    alert("Du musst eingeloggt sein.");
    return null;
  }
  return session.user;
}

// Teil hinzufügen
async function addPart() {
  const title = document.getElementById("partTitle").value.trim();
  const description = document.getElementById("partDescription").value.trim();
  const imageFile = document.getElementById("partImage").files[0];

  if (!title || !description || !imageFile) {
    alert("Bitte fülle alle Felder aus und wähle ein Bild.");
    return;
  }

  const user = await getCurrentUser();
  if (!user) return;

  const fileName = `${user.id}_${Date.now()}_${imageFile.name}`;

  // ✅ Bild hochladen
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('parts-images')
    .upload(fileName, imageFile, {
      cacheControl: '3600',
      upsert: false,
      contentType: imageFile.type,
    });

  if (uploadError) {
    alert("Fehler beim Hochladen des Bildes: " + uploadError.message);
    return;
  }

  // ✅ Öffentliche Bild-URL (für PUBLIC Bucket!)
  const imageUrl = `https://yvdptnkmgfxkrszitweo.supabase.co/storage/v1/object/public/parts-images/${fileName}`;

  // ✅ Teil speichern
  const { error: insertError } = await supabase
    .from('parts')
    .insert([{
      user_id: user.id,
      title,
      description,
      image_url: imageUrl,
    }]);

  if (insertError) {
    alert("Fehler beim Speichern des Teils: " + insertError.message);
    return;
  }

  alert("Teil erfolgreich hinzugefügt!");

  // ✅ Formular leeren
  document.getElementById("partTitle").value = "";
  document.getElementById("partDescription").value = "";
  document.getElementById("partImage").value = "";
}
