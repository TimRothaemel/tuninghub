// Supabase richtig initialisieren (v2)
const { createClient } = supabase;

const supabaseClient = createClient(
  'https://yvdptnkmgfxkrszitweo.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl2ZHB0bmttZ2Z4a3Jzeml0d2VvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA3MDAwMzQsImV4cCI6MjA2NjI3NjAzNH0.Kd6D6IQ_stUMrcbm2TN-7ACjFJvXNmkeNehQHavTmJo',
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  }
);

// Aktuellen Nutzer holen
async function getCurrentUser() {
  const { data: { session }, error } = await supabaseClient.auth.getSession();
  if (error || !session || !session.user) {
    alert("Du musst eingeloggt sein.");
    return null;
  }
  return session.user;
}

// Telefonnummer aus 'profiles' laden
async function loadPhoneNumbers() {
  const user = await getCurrentUser();
  if (!user) return;

  const { data, error } = await supabaseClient
    .from("profiles")
    .select("phone")
    .eq("id", user.id)
    .maybeSingle();

  const select = document.getElementById("contactNumber");
  select.innerHTML = "";

  if (error || !data) {
    console.error("Fehler beim Laden der Telefonnummer:", error);
    return;
  }

  if (data.phone) {
    const option = document.createElement("option");
    option.value = data.phone;
    option.textContent = data.phone;
    select.appendChild(option);
  } else {
    const option = document.createElement("option");
    option.textContent = "Keine Nummer vorhanden";
    option.disabled = true;
    select.appendChild(option);
  }
}

// Telefonnummer in 'profiles' speichern
async function addPhoneNumber() {
  const newNumber = document.getElementById("newPhoneNumber").value.trim();
  if (!newNumber) {
    alert("Bitte gib eine Nummer ein.");
    return;
  }

  const user = await getCurrentUser();
  if (!user) return;

  const { error } = await supabaseClient
    .from("profiles")
    .update({ phone: newNumber })
    .eq("id", user.id);

  if (error) {
    alert("Fehler beim Speichern der Nummer: " + error.message);
    return;
  }

  document.getElementById("newPhoneNumber").value = "";
  await loadPhoneNumbers();
  alert("Nummer erfolgreich gespeichert!");
}

// Teil hinzufügen
async function addPart() {
  const title = document.getElementById("partTitle").value.trim();
  const description = document.getElementById("partDescription").value.trim();
  const price = parseFloat(document.getElementById("partPrice").value.trim());
  const condition = document.getElementById("partCondition").value;
  const phoneNumber = document.getElementById("contactNumber").value;
  const imageFile = document.getElementById("partImage").files[0];

  if (!title || !description || isNaN(price) || !condition || !phoneNumber || !imageFile) {
    alert("Bitte fülle alle Felder korrekt aus und wähle ein Bild.");
    return;
  }

  const user = await getCurrentUser();
  if (!user) return;

  const fileName = `${user.id}_${Date.now()}_${imageFile.name}`;

  // Bild hochladen
  const { data: uploadData, error: uploadError } = await supabaseClient.storage
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

  const imageUrl = `https://yvdptnkmgfxkrszitweo.supabase.co/storage/v1/object/public/parts-images/${fileName}`;

  // Teil speichern
  const { error: insertError } = await supabaseClient
    .from('parts')
    .insert([{
      user_id: user.id,
      title,
      description,
      price,
      condition,
      contact_number: phoneNumber,
      image_url: imageUrl,
    }]);

  if (insertError) {
    alert("Fehler beim Speichern des Teils: " + insertError.message);
    return;
  }

  alert("Teil erfolgreich hinzugefügt!");

  // Formular zurücksetzen
  document.getElementById("partTitle").value = "";
  document.getElementById("partDescription").value = "";
  document.getElementById("partPrice").value = "";
  document.getElementById("partCondition").value = "neu";
  document.getElementById("contactNumber").selectedIndex = 0;
  document.getElementById("partImage").value = "";
}

window.addEventListener("DOMContentLoaded", loadPhoneNumbers);
