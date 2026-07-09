# Plan: Kaydedilenler Kısmını Yeniden Yapılandırma

## Context
Kullanıcı, profil sayfasındaki "Kaydedilenler" sekmesinin çok basit olduğunu ve geliştirilmesi gerektiğini belirtti. Ayrıca, "Kaydedilenler"e tıklandığında alt kategorilerin (Postlar, İş İlanları, Projeler) listelenmesini ve buradan seçim yapıldığında aynı sayfada bu içeriklerin görüntülenmesini istiyor. Ayrıca 1x2 (grid) düzeninden vazgeçildi.

## Hedefler
1. "Kaydedilenler" sekmesine tıklandığında, kullanıcının kategorileri (Postlar, İş İlanları, Projeler) seçebileceği bir alt menü/ekran oluşturmak.
2. Seçilen kategorideki içerikleri listelemek.
3. Sol üst köşeye bir geri butonu ekleyerek ana listeye dönülmesini sağlamak.
4. Videolar için `duration` ve `thumbnailUri` alanlarının veritabanından doğru çekilip gösterilmesi.

## Uygulama Adımları

### 1. Araştırma
- `ProfilePage.js` içerisindeki `tabData` ve `fetchTabData` fonksiyonlarını incele.
- Firestore'dan verilerin nasıl çekildiğini ve kaydedilenler için nasıl bir yapı kurulduğunu anla.
- `Postlar` için kullanılan kart yapısını `Kaydedilenler` içinde de kullanmak için modüler hale getir (veya yeniden kullan).

### 2. Tasarım
- `Kaydedilenler` sekmesi için bir "alt durum" (state) yönetimi kur:
    - `isViewingCategory`: (boolean) alt kategoride miyiz?
    - `activeSavedCategory`: (string) Hangi kategorideyiz (Postlar, İş, Projeler)?
- `fetchTabData` fonksiyonunu `Kaydedilenler` için kategorilere göre veri getirecek şekilde güncelle.

### 3. Uygulama
- `ProfilePage.js` içindeki `selectedTab === 'Kaydedilenler'` bloğunu güncelleyerek kategorileri listele.
- Geri tuşu (Back Button) için bir mantık kur.
- Video gösterimi için `thumbnailUri` ve `duration` alanlarının eksikliğini gidermek için; ya veritabanından çekilen post objesine bu verileri ekle (Post yapısında varsa) ya da Firebase'deki `saves` koleksiyonunun içeriğini güncelle.

### 4. Doğrulama
- "Kaydedilenler"e tıkla, kategorileri gör.
- Bir kategoriye gir, içeriklerin listelendiğinden emin ol.
- Videoların thumbnail ve sürelerinin göründüğünü kontrol et.
- Geri tuşuyla kategoriler ekranına dön.
