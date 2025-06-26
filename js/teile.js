
  async function addPart() {
    const title = document.getElementById("partTitle").value.trim();
    const description = document.getElementById("partDescription").value.trim();
    const imageFile = document.getElementById("partImage").files[0];

    if (!title || !description || !imageFile) {
      alert("Bitte alle Felder ausfüllen und ein Bild auswählen.");
      return;
    }

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      alert("Du musst eingeloggt sein.");
      return;
    }

    const userId = userData.user.id;
    const fileName = `${userId}_${Date.now()}_${imageFile.name}`;

    const { data: imageData, error: imageError } = await supabase.storage
      .from('parts-images')
      .upload(fileName, imageFile);

    if (imageError) {
      alert("Fehler beim Hochladen des Bildes: " + imageError.message);
      return;
    }

    const imageUrl = `https://yvdptnkmgfxkrszitweo.supabase.co/storage/v1/object/public/parts-images/${fileName}`;

    const { error: insertError } = await supabase
      .from('parts')
      .insert([{
        user_id: userId,
        title,
        description,
        image_url: imageUrl
      }]);

    if (insertError) {
      alert("Fehler beim Speichern des Teils: " + insertError.message);
      return;
    }

    alert("Teil erfolgreich hinzugefügt!");
    document.getElementById("partTitle").value = "";
    document.getElementById("partDescription").value = "";
    document.getElementById("partImage").value = "";
  }

