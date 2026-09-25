const CONFIG={productsUrl:"data/productos.json",configUrl:"data/config.json",pageSize:28};
const CART_KEY="patitasYaCartCatalogV1";
const ORDER_BACKUP_KEY="patitasYaLastOrders";

let products=[];
let siteConfig={};
let cart=JSON.parse(localStorage.getItem(CART_KEY)||"[]");
let visibleCount=CONFIG.pageSize;
let searchTerm="";
let selectedCategory="Todos";
let toastTimer;

const $=id=>document.getElementById(id);
const money=value=>value==null?"Consultar":new Intl.NumberFormat("es-CL",{style:"currency",currency:"CLP",maximumFractionDigits:0}).format(value);
const normalize=text=>(text||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim();
const escapeHtml=text=>String(text??"").replace(/[&<>'"]/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[ch]));

async function init(){
  try{
    const [productsResponse,configResponse]=await Promise.all([fetch(CONFIG.productsUrl),fetch(CONFIG.configUrl)]);
    products=await productsResponse.json();
    if(configResponse.ok)siteConfig=await configResponse.json();
    applyConfig();
    renderCategories();
    renderProducts();
    renderCart();
  }catch(error){
    console.error(error);
    $("resultsCount").textContent="No fue posible cargar el catálogo.";
  }
}

function applyConfig(){
  $("storeName").textContent=siteConfig.storeName||"Patitas Ya";
  $("storeTagline").textContent=siteConfig.tagline||"Todo para tus mascotas";
  $("announcementText").textContent=siteConfig.announcement||"🚚 Delivery coordinado";
  $("deliveryText").textContent=(siteConfig.deliveryText||"Delivery coordinado")+". Stock y despacho sujetos a confirmación.";

  const logo=$("siteLogo");
  logo.src=(siteConfig.logo||"assets/images/logo-patitas.png").replaceAll("\\","/");
  logo.onerror=()=>logo.parentElement.classList.add("image-error");

  const methods=Array.isArray(siteConfig.paymentMethods)&&siteConfig.paymentMethods.length
    ?siteConfig.paymentMethods
    :["Transferencia bancaria","Efectivo","Coordinar al confirmar"];
  $("paymentMethod").innerHTML='<option value="">Selecciona una opción</option>'+methods.map(method=>`<option value="${escapeHtml(method)}">${escapeHtml(method)}</option>`).join("");
}

function categoryLabel(category){
  const labels={Perros:"Perros",Gatos:"Gatos",Snacks:"Snacks",Higiene:"Higiene",Aves:"Aves",Roedores:"Roedores"};
  return labels[category]||category;
}

function categoryIcon(category){
  const icons={Todos:"🐾",Perros:"🐶",Gatos:"🐱",Snacks:"🦴",Higiene:"🧼",Aves:"🐦",Roedores:"🐰"};
  return icons[category]||"🐾";
}

function renderCategories(){
  const categories=["Todos",...[...new Set(products.map(product=>product.category).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"es"))];
  $("categoryGrid").innerHTML=categories.map(category=>`
    <button class="category-chip ${category===selectedCategory?"active":""}" type="button" data-category="${escapeHtml(category)}">
      <span>${categoryIcon(category)}</span>${category==="Todos"?"Todos":categoryLabel(category)}
    </button>`).join("");
  $("categoryGrid").querySelectorAll(".category-chip").forEach(button=>button.addEventListener("click",()=>chooseCategory(button.dataset.category)));
}

function chooseCategory(category){
  selectedCategory=category;
  visibleCount=CONFIG.pageSize;
  renderCategories();
  renderProducts();
  document.querySelector(".products-section")?.scrollIntoView({behavior:"smooth",block:"start"});
}

function filteredProducts(){
  const words=normalize(searchTerm).split(/\s+/).filter(Boolean);
  return products.filter(product=>{
    const name=normalize(product.name);
    const matchesName=!words.length||words.every(word=>name.includes(word));
    const matchesCategory=selectedCategory==="Todos"||product.category===selectedCategory;
    return matchesName&&matchesCategory;
  }).sort((a,b)=>Number(b.featured)-Number(a.featured)||a.name.localeCompare(b.name,"es"));
}

function imageMarkup(product){
  const src=(product.image||"").replaceAll("\\","/");
  return `<img class="product-image" src="${escapeHtml(src)}" alt="${escapeHtml(product.name)}" loading="lazy" onerror="this.parentElement.classList.add('image-error')">
    <div class="image-fallback"><div>Imagen pendiente</div></div>`;
}

function priceMarkup(product){
  if(product.price==null)return '<span class="consult-price">Consultar precio</span>';
  return `${product.oldPrice?`<span class="old-price">${money(product.oldPrice)}</span>`:""}<span class="price">${money(product.price)}</span>`;
}

function cardMarkup(product){
  return `<article class="product-card">
    <div class="product-card__image" onclick="openProduct(${product.id})">
      ${product.badge?`<span class="badge">${escapeHtml(product.badge)}</span>`:""}
      ${imageMarkup(product)}
    </div>
    <div class="product-card__content">
      <span class="meta">${escapeHtml(product.brand||"")} ${product.weight?`· ${escapeHtml(product.weight)}`:""}</span>
      <h3>${escapeHtml(product.name)}</h3>
      <div class="price-row">${priceMarkup(product)}</div>
      <div class="card-actions">
        <button class="details" type="button" onclick="openProduct(${product.id})">Ver detalle</button>
        <button class="add" type="button" onclick="addToCart(${product.id})" ${product.price==null?"disabled":""}>Agregar</button>
      </div>
    </div>
  </article>`;
}

function renderProducts(){
  const list=filteredProducts();
  const visible=list.slice(0,visibleCount);
  $("resultsCount").textContent=`${list.length} producto${list.length===1?"":"s"}`;
  $("catalogTitle").textContent=selectedCategory==="Todos"?"Todos los productos":categoryLabel(selectedCategory);
  $("productGrid").innerHTML=visible.map(cardMarkup).join("");
  $("emptyState").classList.toggle("hidden",list.length>0);
  $("loadMore").classList.toggle("hidden",visible.length>=list.length);
  $("activeSearch").classList.toggle("hidden",!searchTerm);
  $("activeSearch").textContent=searchTerm?`Buscando por nombre: “${searchTerm}”`:"";
  $("clearFilters").classList.toggle("hidden",!searchTerm&&selectedCategory==="Todos");
}

function resetCatalog(){
  searchTerm="";
  selectedCategory="Todos";
  visibleCount=CONFIG.pageSize;
  $("searchInput").value="";
  renderCategories();
  renderProducts();
}

function openProduct(id){
  const product=products.find(item=>item.id===id);
  if(!product)return;
  $("productDetail").innerHTML=`<div class="product-detail">
    <div class="product-detail__visual">${imageMarkup(product)}</div>
    <div class="product-detail__copy">
      <span class="meta">${escapeHtml(product.brand||"")} · ${escapeHtml(product.category||"")} ${product.weight?`· ${escapeHtml(product.weight)}`:""}</span>
      <h2>${escapeHtml(product.name)}</h2>
      <p>${escapeHtml(product.description||product.shortDescription||"Producto disponible sujeto a confirmación de stock.")}</p>
      ${product.benefits?.length?`<ul>${product.benefits.map(benefit=>`<li>${escapeHtml(benefit)}</li>`).join("")}</ul>`:""}
      <div class="price-row">${priceMarkup(product)}</div>
      <button class="add-detail" type="button" onclick="addToCart(${product.id});closeProduct()" ${product.price==null?"disabled":""}>Agregar a mi pedido</button>
    </div>
  </div>`;
  openModal("productModal");
}

function closeProduct(){closeModal("productModal")}

function addToCart(id){
  const product=products.find(item=>item.id===id);
  if(!product||product.price==null)return;
  const item=cart.find(entry=>entry.id===id);
  if(item)item.quantity+=1;
  else cart.push({id,quantity:1});
  saveCart();
  showToast(`${product.name} agregado`);
}

function changeQty(id,delta){
  const item=cart.find(entry=>entry.id===id);
  if(!item)return;
  item.quantity+=delta;
  if(item.quantity<=0)cart=cart.filter(entry=>entry.id!==id);
  saveCart();
}

function removeItem(id){cart=cart.filter(entry=>entry.id!==id);saveCart()}
function saveCart(){localStorage.setItem(CART_KEY,JSON.stringify(cart));renderCart()}

function detailedCart(){
  return cart.map(entry=>{
    const product=products.find(item=>item.id===entry.id);
    return product?{...product,quantity:entry.quantity}:null;
  }).filter(Boolean);
}

function cartTotal(){return detailedCart().reduce((sum,item)=>sum+(item.price||0)*item.quantity,0)}

function renderCart(){
  const detailed=detailedCart();
  $("cartCount").textContent=detailed.reduce((sum,item)=>sum+item.quantity,0);
  $("cartTotal").textContent=money(cartTotal());
  $("cartEmpty").classList.toggle("hidden",detailed.length>0);
  $("checkoutButton").disabled=!detailed.length;
  $("cartItems").innerHTML=detailed.map(item=>`<div class="cart-item">
    <img src="${escapeHtml((item.image||"").replaceAll("\\","/"))}" alt="${escapeHtml(item.name)}" onerror="this.style.visibility='hidden'">
    <div>
      <h4>${escapeHtml(item.name)}</h4>
      <small>${money(item.price)} c/u</small>
      <button class="remove" type="button" onclick="removeItem(${item.id})">Eliminar</button>
    </div>
    <div class="quantity">
      <button type="button" onclick="changeQty(${item.id},-1)">−</button>
      <strong>${item.quantity}</strong>
      <button type="button" onclick="changeQty(${item.id},1)">+</button>
    </div>
  </div>`).join("");
}

function openCart(){
  $("cartDrawer").classList.add("open");
  showOverlay();
}
function closeCart(){
  $("cartDrawer").classList.remove("open");
  syncOverlay();
}

function openCheckout(){
  if(!cart.length)return;
  closeCart();
  const detailed=detailedCart();
  $("checkoutSummary").innerHTML=detailed.map(item=>`<div class="checkout-summary__line"><span>${item.quantity} × ${escapeHtml(item.name)}</span><strong>${money(item.price*item.quantity)}</strong></div>`).join("")+`<div class="checkout-summary__total"><span>Total productos</span><strong>${money(cartTotal())}</strong></div>`;
  $("formMessage").textContent="";
  openModal("checkoutModal");
}

function generateOrderId(){
  const now=new Date();
  const date=now.toISOString().slice(0,10).replaceAll("-","");
  const random=Math.random().toString(36).slice(2,6).toUpperCase();
  return `PY-${date}-${random}`;
}

function buildOrderPayload(){
  const items=detailedCart().map(item=>({
    id:item.id,
    name:item.name,
    quantity:item.quantity,
    unitPrice:item.price,
    subtotal:item.price*item.quantity
  }));
  return {
    orderId:generateOrderId(),
    createdAt:new Date().toISOString(),
    name:$("customerName").value.trim(),
    phone:$("customerPhone").value.trim(),
    address:$("customerAddress").value.trim(),
    paymentMethod:$("paymentMethod").value,
    notes:$("customerNotes").value.trim(),
    items,
    total:cartTotal(),
    source:"Patitas Ya web"
  };
}

function backupOrderLocally(order){
  try{
    const previous=JSON.parse(localStorage.getItem(ORDER_BACKUP_KEY)||"[]");
    previous.unshift(order);
    localStorage.setItem(ORDER_BACKUP_KEY,JSON.stringify(previous.slice(0,10)));
  }catch(error){console.warn("No se pudo guardar respaldo local",error)}
}

async function submitOrder(event){
  event.preventDefault();
  if(!cart.length){$("formMessage").textContent="Tu pedido está vacío.";return}
  if(!$("orderForm").reportValidity())return;

  const endpoint=(siteConfig.orderEndpoint||"").trim();
  if(!/^https:\/\//i.test(endpoint)||endpoint.includes("PEGA_AQUI")){
    $("formMessage").textContent="El formulario aún no está conectado al registro de pedidos. Configura orderEndpoint en data/config.json.";
    return;
  }

  const order=buildOrderPayload();
  backupOrderLocally(order);
  const button=$("submitOrder");
  button.disabled=true;
  button.textContent="Enviando pedido...";
  $("formMessage").textContent="";

  try{
    await fetch(endpoint,{
      method:"POST",
      mode:"no-cors",
      headers:{"Content-Type":"text/plain;charset=utf-8"},
      body:JSON.stringify(order)
    });

    cart=[];
    saveCart();
    $("orderForm").reset();
    closeModal("checkoutModal",false);
    $("successText").textContent=`Tu solicitud ${order.orderId} fue enviada. Te contactaremos al ${order.phone} para confirmar stock, despacho y pago.`;
    openModal("successModal");
  }catch(error){
    console.error(error);
    $("formMessage").textContent="No pudimos enviar el pedido. Revisa tu conexión e inténtalo nuevamente.";
  }finally{
    button.disabled=false;
    button.textContent="Enviar pedido";
  }
}

function openModal(id){
  $(id).classList.add("open");
  showOverlay();
}
function closeModal(id,sync=true){
  $(id).classList.remove("open");
  if(sync)syncOverlay();
}
function showOverlay(){
  $("overlay").classList.add("show");
  document.body.classList.add("no-scroll");
}
function syncOverlay(){
  const anyOpen=$("cartDrawer").classList.contains("open")||document.querySelector(".modal.open");
  if(!anyOpen){
    $("overlay").classList.remove("show");
    document.body.classList.remove("no-scroll");
  }
}
function closeEverything(){
  $("cartDrawer").classList.remove("open");
  document.querySelectorAll(".modal.open").forEach(modal=>modal.classList.remove("open"));
  $("overlay").classList.remove("show");
  document.body.classList.remove("no-scroll");
}
function showToast(message){
  clearTimeout(toastTimer);
  $("toast").textContent=message;
  $("toast").classList.add("show");
  toastTimer=setTimeout(()=>$("toast").classList.remove("show"),1600);
}

$("searchInput").addEventListener("input",event=>{searchTerm=event.target.value;visibleCount=CONFIG.pageSize;renderProducts()});
$("clearSearch").addEventListener("click",()=>{searchTerm="";$("searchInput").value="";visibleCount=CONFIG.pageSize;renderProducts()});
$("clearFilters").addEventListener("click",resetCatalog);
$("loadMore").addEventListener("click",()=>{visibleCount+=CONFIG.pageSize;renderProducts()});
$("openCart").addEventListener("click",openCart);
$("closeCart").addEventListener("click",closeCart);
$("checkoutButton").addEventListener("click",openCheckout);
$("closeProductModal").addEventListener("click",closeProduct);
$("closeCheckout").addEventListener("click",()=>closeModal("checkoutModal"));
$("closeSuccess").addEventListener("click",()=>{closeModal("successModal");document.getElementById("catalogo").scrollIntoView({behavior:"smooth"})});
$("orderForm").addEventListener("submit",submitOrder);
$("overlay").addEventListener("click",closeEverything);

document.addEventListener("keydown",event=>{if(event.key==="Escape")closeEverything()});

init();
