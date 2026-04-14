/* Get references to DOM elements */
const categoryFilter = document.getElementById("categoryFilter");
const productSearch = document.getElementById("productSearch");
const searchResults = document.getElementById("searchResults");
const productsContainer = document.getElementById("productsContainer");
const productViewer = document.getElementById("productViewer");
const selectedProductsList = document.getElementById("selectedProductsList");
const generateRoutineButton = document.getElementById("generateRoutine");
const generateRoutineText = document.getElementById("generateRoutineText");
const siteTitle = document.getElementById("siteTitle");
const selectedProductsTitle = document.getElementById("selectedProductsTitle");
const chatHeading = document.getElementById("chatHeading");
const userInput = document.getElementById("userInput");
const languageToggle = document.getElementById("languageToggle");
const chatForm = document.getElementById("chatForm");
const chatWindow = document.getElementById("chatWindow");

/* Keep the product data and selected items in memory */
let allProducts = [];
let selectedProductIds = [];
let currentCategory = "";
let currentSearchTerm = "";
const selectedProductsStorageKey = "loreal-selected-products";
const languageStorageKey = "loreal-language";
let currentLanguage = localStorage.getItem(languageStorageKey) || "en";

const translations = {
  en: {
    siteTitle: "Smart Routine & Product Advisor",
    searchLabel: "Search products",
    searchPlaceholder: "Search products by name, brand, or description",
    searchResultsEmpty: "No matches found.",
    categoryPlaceholder: "Choose a Category",
    selectedProductsTitle: "Selected Products",
    noSelectedProducts: "No products selected yet.",
    selectCategory: "Select a category to view products",
    searchOrCategoryHint:
      "Type at least 3 characters or choose a category to view products.",
    noSearchResults: "No products match your search.",
    generateRoutine: "Generate Routine",
    chatHeading: "Let's Build Your Routine",
    chatPlaceholder: "Ask me about products or routines…",
    thinking: "Thinking...",
    buildingRoutine: "Building your routine...",
    apiError: "Sorry, I could not reach the API right now. Please try again.",
    routineError: "Sorry, I could not generate the routine right now.",
    noSelectedBeforeRoutine:
      "Select at least one product before generating a routine.",
    languageLabel: "Language",
  },
  ar: {
    siteTitle: "مستشار الروتين والمنتجات الذكي",
    searchLabel: "ابحث عن المنتجات",
    searchPlaceholder: "ابحث عن المنتجات بالاسم أو العلامة أو الوصف",
    searchResultsEmpty: "لا توجد نتائج مطابقة.",
    categoryPlaceholder: "اختر فئة",
    selectedProductsTitle: "المنتجات المختارة",
    noSelectedProducts: "لم يتم اختيار أي منتجات بعد.",
    selectCategory: "اختر فئة لعرض المنتجات",
    searchOrCategoryHint: "اكتب 3 أحرف على الأقل أو اختر فئة لعرض المنتجات.",
    noSearchResults: "لا توجد منتجات مطابقة لبحثك.",
    generateRoutine: "إنشاء الروتين",
    chatHeading: "لننشىء روتينك",
    chatPlaceholder: "اسألني عن المنتجات أو الروتين…",
    thinking: "جاري التفكير...",
    buildingRoutine: "جارٍ إنشاء الروتين...",
    apiError: "عذرًا، تعذر الوصول إلى واجهة API الآن. حاول مرة أخرى.",
    routineError: "عذرًا، تعذر إنشاء الروتين الآن.",
    noSelectedBeforeRoutine: "اختر منتجًا واحدًا على الأقل قبل إنشاء الروتين.",
    languageLabel: "اللغة",
  },
};

function getUIText() {
  return translations[currentLanguage] || translations.en;
}

function saveLanguagePreference() {
  localStorage.setItem(languageStorageKey, currentLanguage);
}

function applyLanguage(language) {
  currentLanguage = translations[language] ? language : "en";
  const text = getUIText();

  document.documentElement.lang = currentLanguage;
  document.documentElement.dir = currentLanguage === "ar" ? "rtl" : "ltr";
  document.body.classList.toggle("is-rtl", currentLanguage === "ar");
  languageToggle.value = currentLanguage;
  document.title =
    currentLanguage === "ar"
      ? "مستشار الروتين والمنتجات الذكي | لوريال"
      : "L'Oréal | Smart Routine & Product Advisor";

  siteTitle.textContent = text.siteTitle;
  selectedProductsTitle.textContent = text.selectedProductsTitle;
  generateRoutineText.textContent = text.generateRoutine;
  chatHeading.textContent = text.chatHeading;
  userInput.placeholder = text.chatPlaceholder;
  productSearch.placeholder = text.searchPlaceholder;
  categoryFilter.options[0].textContent = text.categoryPlaceholder;
  languageToggle.setAttribute("aria-label", text.languageLabel);

  displayProducts();
  displaySelectedProducts();
  displaySearchResults();
  displayProductViewer(null);
  saveLanguagePreference();
}

/* Show initial placeholder until user selects a category */
productsContainer.innerHTML = `
  <div class="placeholder-message">
    Select a category to view products
  </div>
`;

/* Show an empty state for the selected products area */
selectedProductsList.innerHTML = `
  <div class="selected-placeholder">No products selected yet.</div>
`;

/* Keep the hover viewer hidden until a product is hovered */
productViewer.classList.remove("is-visible");
productViewer.innerHTML = "";

/* Load product data from JSON file */
async function loadProducts() {
  const response = await fetch("products.json");
  const data = await response.json();
  return data.products;
}

/* Build a short summary of selected products for the API request */
function getSelectedProductsSummary() {
  const selectedProducts = allProducts.filter((product) =>
    selectedProductIds.includes(product.id),
  );

  if (selectedProducts.length === 0) {
    return "No products have been selected yet.";
  }

  return selectedProducts
    .map((product) => `${product.brand} - ${product.name}`)
    .join("\n");
}

/* Add a chat bubble to the conversation window */
function appendChatMessage(role, message) {
  const messageElement = document.createElement("div");
  messageElement.className = `chat-message chat-message-${role}`;
  messageElement.textContent = message;
  chatWindow.appendChild(messageElement);
  chatWindow.scrollTop = chatWindow.scrollHeight;
  return messageElement;
}

/* Send a message to the Cloudflare Worker and return the reply */
async function getApiResponse(userMessage) {
  const selectedProductsSummary = getSelectedProductsSummary();
  const text = getUIText();
  const responseLanguage = currentLanguage === "ar" ? "Arabic" : "English";

  const messages = [
    {
      role: "system",
      content: `You are a helpful L'Oréal routine advisor. Respond in ${responseLanguage}. Use simple, beginner-friendly language and keep replies focused on the user's products and request.`,
    },
    {
      role: "user",
      content: `${text.selectedProductsTitle}:\n${selectedProductsSummary}\n\n${currentLanguage === "ar" ? "طلب المستخدم" : "User request"}: ${userMessage}`,
    },
  ];

  const response = await fetch(OPENAI_WORKER_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o",
      messages,
    }),
  });

  if (!response.ok) {
    throw new Error("The API request failed.");
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("The API response did not include a message.");
  }

  return content;
}

/* Save the selected product IDs so they persist after refresh */
function saveSelectedProducts() {
  localStorage.setItem(
    selectedProductsStorageKey,
    JSON.stringify(selectedProductIds),
  );
}

/* Restore selected products from localStorage */
function loadSelectedProducts() {
  const savedProducts = localStorage.getItem(selectedProductsStorageKey);

  if (!savedProducts) {
    return;
  }

  try {
    const parsedProducts = JSON.parse(savedProducts);

    if (Array.isArray(parsedProducts)) {
      selectedProductIds = parsedProducts;
    } else {
      selectedProductIds = [];
    }
  } catch (error) {
    selectedProductIds = [];
  }
}

/* Render the list of selected products below the product grid */
function displaySelectedProducts() {
  const text = getUIText();
  const selectedProducts = allProducts.filter((product) =>
    selectedProductIds.includes(product.id),
  );

  if (selectedProducts.length === 0) {
    selectedProductsList.innerHTML = `
      <div class="selected-placeholder">${text.noSelectedProducts}</div>
    `;
    return;
  }

  selectedProductsList.innerHTML = selectedProducts
    .map(
      (product) => `
        <div class="selected-product-item">
          <div>
            <strong>${product.brand}</strong>
            <p>${product.name}</p>
          </div>
          <button
            type="button"
            class="remove-product-btn"
            data-product-id="${product.id}"
            aria-label="Delete ${product.name} from selected products"
          >
            Delete
          </button>
        </div>
      `,
    )
    .join("");
}

/* Show matching products above the category dropdown once the user types enough characters */
function displaySearchResults() {
  const text = getUIText();

  if (currentSearchTerm.length < 3) {
    searchResults.classList.remove("is-visible");
    searchResults.innerHTML = "";
    return;
  }

  const searchTerm = currentSearchTerm.toLowerCase();
  const matchingProducts = allProducts.filter((product) =>
    [product.name, product.brand, product.description]
      .join(" ")
      .toLowerCase()
      .includes(searchTerm),
  );

  if (matchingProducts.length === 0) {
    searchResults.innerHTML = `
      <div class="search-results-empty">${text.searchResultsEmpty}</div>
    `;
    searchResults.classList.add("is-visible");
    return;
  }

  searchResults.innerHTML = matchingProducts
    .slice(0, 5)
    .map(
      (product) => `
        <button type="button" class="search-result-item" data-product-id="${product.id}">
          <span class="search-result-brand">${product.brand}</span>
          <span class="search-result-name">${product.name}</span>
        </button>
      `,
    )
    .join("");
  searchResults.classList.add("is-visible");
}

/* Show product details in the hover viewer */
function displayProductViewer(product) {
  if (!product) {
    productViewer.classList.remove("is-visible");
    productViewer.innerHTML = "";
    return;
  }

  productViewer.innerHTML = `
    <div class="product-viewer-card">
      <img src="${product.image}" alt="${product.name}">
      <div class="product-viewer-copy">
        <p class="product-viewer-brand">${product.brand}</p>
        <h3>${product.name}</h3>
        <p class="product-viewer-description">${product.description}</p>
      </div>
    </div>
  `;
  productViewer.classList.add("is-visible");
}

/* Add or remove a product from the selected list */
function toggleSelectedProduct(productId) {
  const selectedIndex = selectedProductIds.indexOf(productId);

  if (selectedIndex === -1) {
    selectedProductIds.push(productId);
  } else {
    selectedProductIds.splice(selectedIndex, 1);
  }

  saveSelectedProducts();
  displayProducts();
  displaySelectedProducts();
}

/* Create HTML for displaying product cards */
function displayProducts() {
  const text = getUIText();
  const hasCategorySelection = Boolean(currentCategory);
  const hasValidSearchTerm = currentSearchTerm.length >= 3;

  if (!hasCategorySelection && !hasValidSearchTerm) {
    productsContainer.innerHTML = `
      <div class="placeholder-message">
        ${text.searchOrCategoryHint}
      </div>
    `;
    return;
  }

  const filteredProducts = (
    currentCategory
      ? allProducts.filter((product) => product.category === currentCategory)
      : allProducts
  ).filter((product) => {
    if (!hasValidSearchTerm) {
      return true;
    }

    const searchTerm = currentSearchTerm.toLowerCase();

    return [product.name, product.brand, product.description]
      .join(" ")
      .toLowerCase()
      .includes(searchTerm);
  });

  if (filteredProducts.length === 0) {
    productsContainer.innerHTML = `
      <div class="placeholder-message">
        ${hasValidSearchTerm ? text.noSearchResults : text.selectCategory}
      </div>
    `;
    return;
  }

  productsContainer.innerHTML = filteredProducts
    .map(
      (product) => `
    <button type="button" class="product-card ${
      selectedProductIds.includes(product.id) ? "is-selected" : ""
    }" data-product-id="${product.id}">
      <img src="${product.image}" alt="${product.name}">
      <div class="product-info">
        <h3>${product.name}</h3>
        <p>${product.brand}</p>
      </div>
    </button>
  `,
    )
    .join("");
}

/* Load products once when the page opens */
loadProducts().then((products) => {
  allProducts = products;
  loadSelectedProducts();
  selectedProductIds = selectedProductIds.filter((productId) =>
    allProducts.some((product) => product.id === productId),
  );
  saveSelectedProducts();
  applyLanguage(currentLanguage);
  displayProducts();
  displaySelectedProducts();
});

/* Handle clicks on product cards and remove buttons */
productsContainer.addEventListener("click", (e) => {
  const productCard = e.target.closest(".product-card");

  if (!productCard) {
    return;
  }

  const productId = Number(productCard.dataset.productId);
  toggleSelectedProduct(productId);
});

productsContainer.addEventListener("mouseover", (e) => {
  const productCard = e.target.closest(".product-card");

  if (!productCard) {
    return;
  }

  const productId = Number(productCard.dataset.productId);
  const hoveredProduct = allProducts.find(
    (product) => product.id === productId,
  );
  displayProductViewer(hoveredProduct);
});

productsContainer.addEventListener("mouseout", (e) => {
  const productCard = e.target.closest(".product-card");

  if (!productCard) {
    return;
  }

  const isStillInsideCard = productCard.contains(e.relatedTarget);

  if (!isStillInsideCard) {
    displayProductViewer(null);
  }
});

selectedProductsList.addEventListener("click", (e) => {
  const removeButton = e.target.closest(".remove-product-btn");

  if (!removeButton) {
    return;
  }

  const productId = Number(removeButton.dataset.productId);
  selectedProductIds = selectedProductIds.filter((id) => id !== productId);
  saveSelectedProducts();
  displayProducts();
  displaySelectedProducts();
});

/* Filter and display products when category changes */
categoryFilter.addEventListener("change", (e) => {
  currentCategory = e.target.value;
  displayProducts();
  displayProductViewer(null);
});

/* Filter products as the user types in the search bar */
productSearch.addEventListener("input", (e) => {
  currentSearchTerm = e.target.value.trim();
  displayProducts();
  displaySearchResults();
});

/* Let users click a live search result to jump to that product's category */
searchResults.addEventListener("click", (e) => {
  const resultButton = e.target.closest(".search-result-item");

  if (!resultButton) {
    return;
  }

  const productId = Number(resultButton.dataset.productId);
  const selectedProduct = allProducts.find(
    (product) => product.id === productId,
  );

  if (!selectedProduct) {
    return;
  }

  currentCategory = selectedProduct.category;
  categoryFilter.value = selectedProduct.category;
  currentSearchTerm = selectedProduct.name;
  productSearch.value = selectedProduct.name;
  displayProducts();
  displaySearchResults();
});

languageToggle.addEventListener("change", (e) => {
  applyLanguage(e.target.value);
});

/* Chat form submission handler */
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const message = userInput.value.trim();

  if (!message) {
    return;
  }

  appendChatMessage("user", message);
  userInput.value = "";

  const thinkingMessage = appendChatMessage("assistant", getUIText().thinking);

  try {
    const reply = await getApiResponse(message);
    thinkingMessage.remove();
    appendChatMessage("assistant", reply);
  } catch (error) {
    thinkingMessage.remove();
    appendChatMessage("assistant", getUIText().apiError);
  }
});

/* Generate a routine from the selected products */
generateRoutineButton.addEventListener("click", async () => {
  if (selectedProductIds.length === 0) {
    appendChatMessage("assistant", getUIText().noSelectedBeforeRoutine);
    return;
  }

  const thinkingMessage = appendChatMessage(
    "assistant",
    getUIText().buildingRoutine,
  );

  try {
    const reply = await getApiResponse(
      `Create a personalized routine using these products:\n${getSelectedProductsSummary()}`,
    );
    thinkingMessage.remove();
    appendChatMessage("assistant", reply);
  } catch (error) {
    thinkingMessage.remove();
    appendChatMessage("assistant", getUIText().routineError);
  }
});
