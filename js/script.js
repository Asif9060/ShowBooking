"use strict";

(function () {
   const API_BASE_URL = window.__APP_CONFIG__?.apiBaseUrl || "http://localhost:4000/api";
   const AUTH_SESSION_KEY = "msb_user_session";
   const LOCAL_BOOKINGS_KEY = "msb_local_bookings_v1";
   const FALLBACK_SEAT_MULTIPLIERS = { front: 1.5, middle: 1.0, back: 0.75 };
   const FALLBACK_SEAT_LAYOUT = { rows: 6, cols: 8 };

   const FALLBACK_MOVIES = [
      {
         id: "m1",
         title: "Starline Odyssey",
         runtime: "2h 12m",
         rating: "PG-13",
         price: 1050,
         showtimes: ["10:30", "13:00", "16:15", "19:40"],
         synopsis:
            "An epic journey across galaxies where a crew must choose between duty and destiny.",
         genres: ["Science Fiction", "Adventure"],
         cast: ["Amir Patel", "Zoe Chen", "Kara Holt"],
         director: "Lena Qureshi",
         producer: "Northstar Studios",
         imdbRating: 8.6,
         releaseYear: 2025,
         status: "published",
         posterColor: ["#ff8a65", "#f78fb3"],
      },
      {
         id: "m2",
         title: "Silent Grove",
         runtime: "1h 44m",
         rating: "R",
         price: 880,
         showtimes: ["11:00", "14:30", "18:00", "21:30"],
         synopsis:
            "A hauntingly beautiful tale of a town that keeps its darkest secrets buried.",
         genres: ["Thriller", "Mystery"],
         cast: ["Noah Griffin", "Mira Sato", "Elias Monroe"],
         director: "Elena Ruiz",
         producer: "Silverline Pictures",
         imdbRating: 7.9,
         releaseYear: 2024,
         status: "published",
         posterColor: ["#7c5cff", "#00c6ff"],
      },
      {
         id: "m3",
         title: "The Last Recipe",
         runtime: "1h 58m",
         rating: "PG",
         price: 825,
         showtimes: ["09:50", "12:20", "15:50", "20:00"],
         synopsis:
            "A chef races to reclaim his legacy in a world where flavor can change fate.",
         genres: ["Drama", "Family"],
         cast: ["Liana Brooks", "Jared Okafor", "Sofia Delgado"],
         director: "Marcus DeVine",
         producer: "Harvest Media",
         imdbRating: 8.1,
         releaseYear: 2023,
         status: "published",
         posterColor: ["#ffc107", "#ff6b6b"],
      },
      {
         id: "m4",
         title: "Neon Drift",
         runtime: "2h 03m",
         rating: "PG-13",
         price: 1100,
         showtimes: ["12:00", "15:30", "18:45", "22:00"],
         synopsis:
            "High-speed street racers take on a futuristic metropolis in a pulse-pounding ride.",
         genres: ["Action", "Sci-Fi"],
         cast: ["Jun Park", "Riley Anders", "Priya Malhotra"],
         director: "Haruto Watanabe",
         producer: "Velocity Works",
         imdbRating: 8.4,
         releaseYear: 2025,
         status: "published",
         posterColor: ["#00d2ff", "#3a7bd5"],
      },
   ];

   const FALLBACK_UPCOMING = [
      {
         id: "u1",
         title: "Moonchild",
         releaseDate: "2025-12-05",
         status: "published",
         summary: "A dreamer discovers a cosmic secret tied to the moon.",
         posterColor: ["#ff7eb3", "#ff758c"],
      },
      {
         id: "u2",
         title: "Aether Fields",
         releaseDate: "2026-01-18",
         status: "draft",
         summary: "The atmosphere becomes the new frontier for explorers.",
         posterColor: ["#7c5cff", "#00c6ff"],
      },
      {
         id: "u3",
         title: "Glass Harbor",
         releaseDate: "2025-11-22",
         status: "published",
         summary: "Detectives chase elusive smugglers across shimmering docks.",
         posterColor: ["#00d2ff", "#3a7bd5"],
      },
   ];

   const FALLBACK_CAROUSEL = [
      {
         id: "c1",
         title: "Starline Odyssey",
         subtitle: "Now Showing",
         description:
            "An epic journey across galaxies where a crew must choose between duty and destiny.",
         highlights: ["Premium Large Format", "Dolby Atmos"],
         movieId: "m1",
         priority: 3,
         posterColor: ["#111d40", "#1b264f"],
      },
      {
         id: "c2",
         title: "Silent Grove",
         subtitle: "Mystery Spotlight",
         description: "Secrets rustle in the midnight breeze as silence hides the truth.",
         highlights: ["New Release", "Thriller"],
         movieId: "m2",
         priority: 2,
         posterColor: ["#251431", "#1a1f3b"],
         ctaText: "Watch Trailer",
         ctaUrl: "https://example.com/trailer",
      },
      {
         id: "c3",
         title: "The Last Recipe",
         subtitle: "Family Favorite",
         description:
            "A chef races to reclaim his legacy in a world where flavor can change fate.",
         highlights: ["Family", "Drama"],
         movieId: "m3",
         priority: 1,
         posterColor: ["#281716", "#341b33"],
      },
   ];

   const FALLBACK_CONFIG = {
      brandTitle: "Movie and Show Booking",
      tagline: "Discover movies • Pick showtimes • Book seats",
      supportEmail: "support@example.com",
      seatMultipliers: { ...FALLBACK_SEAT_MULTIPLIERS },
      backgroundVideoUrl: "video/BG.mp4",
   };

   const state = {
      movies: [],
      upcoming: [],
      carousel: [],
      config: { ...FALLBACK_CONFIG },
      seatMultipliers: { ...FALLBACK_SEAT_MULTIPLIERS },
      user: null,
      userId: null,
      sessionToken: null,
      sessionExpiresAt: null,
      isAdmin: false,
      userBookings: [],
      hero: {
         items: [],
         activeIndex: 0,
         timerId: null,
         isHovering: false,
         isFocusLocked: false,
      },
      admin: {
         movies: [],
         upcoming: [],
         carousel: [],
         media: [],
         bookings: [],
         users: [],
      },
      editing: {
         movieId: null,
         upcomingId: null,
         carouselId: null,
      },
   };

   const dom = {};
   const localSeatCache = new Map();

   function persistAuthState() {
      try {
         if (state.userId && state.sessionToken && state.sessionExpiresAt) {
            localStorage.setItem(
               AUTH_SESSION_KEY,
               JSON.stringify({
                  userId: state.userId,
                  token: state.sessionToken,
                  expiresAt: state.sessionExpiresAt,
               })
            );
         } else {
            localStorage.removeItem(AUTH_SESSION_KEY);
         }
      } catch (error) {
         console.warn("Unable to persist auth state", error);
      }
   }

   function readStoredAuthState() {
      try {
         const raw = localStorage.getItem(AUTH_SESSION_KEY);
         if (!raw) return null;
         const parsed = JSON.parse(raw);
         if (!parsed || typeof parsed !== "object") return null;
         const token = typeof parsed.token === "string" ? parsed.token : "";
         const userId = typeof parsed.userId === "string" ? parsed.userId : "";
         const expiresAt = typeof parsed.expiresAt === "string" ? parsed.expiresAt : "";
         if (!token || !userId || !expiresAt) return null;
         const expiryTime = Date.parse(expiresAt);
         if (!Number.isFinite(expiryTime)) return null;
         return {
            token,
            userId,
            expiresAt: new Date(expiryTime).toISOString(),
         };
      } catch (error) {
         console.warn("Unable to read stored auth state", error);
         return null;
      }
   }

   function isSessionExpired(expiresAt) {
      if (!expiresAt) return true;
      const expiryTime = Date.parse(expiresAt);
      if (!Number.isFinite(expiryTime)) return true;
      return expiryTime <= Date.now();
   }

   function normalizeSeatLayout(layout = {}) {
      const parse = (value, fallback) => {
         const parsed = Number.parseInt(value, 10);
         return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
      };
      return {
         rows: parse(layout.rows, FALLBACK_SEAT_LAYOUT.rows),
         cols: parse(layout.cols, FALLBACK_SEAT_LAYOUT.cols),
      };
   }

   function buildSeatCodesFromLayout(layoutInput) {
      const layout = normalizeSeatLayout(layoutInput);
      const codes = [];
      for (let row = 0; row < layout.rows; row += 1) {
         const rowLabel = String.fromCharCode(65 + row);
         for (let col = 1; col <= layout.cols; col += 1) {
            codes.push(`${rowLabel}${col}`);
         }
      }
      return { layout, codes };
   }

   function normalizeSeatAvailabilityPayload(payload = {}) {
      const { layout: rawLayout, seats: seatsInfo = {} } = payload;
      const { layout, codes } = buildSeatCodesFromLayout(rawLayout);

      const bookedSources = [];
      if (Array.isArray(payload.booked)) bookedSources.push(payload.booked);
      if (Array.isArray(seatsInfo.booked)) bookedSources.push(seatsInfo.booked);
      const bookedSet = new Set(
         bookedSources.flat().filter((seat) => typeof seat === "string")
      );

      const providedAvailable = Array.isArray(seatsInfo.available)
         ? seatsInfo.available.filter((seat) => typeof seat === "string")
         : [];

      const computedAvailable = codes.filter((seat) => !bookedSet.has(seat));
      const available = providedAvailable.length
         ? Array.from(
              new Set(
                 providedAvailable
                    .concat(computedAvailable)
                    .filter((seat) => !bookedSet.has(seat) && codes.includes(seat))
              )
           )
         : computedAvailable;

      const booked = Array.from(bookedSet).filter((seat) => codes.includes(seat));

      return {
         layout,
         booked,
         seats: {
            total: codes.length,
            available,
            booked,
         },
      };
   }

   let isAuthInitialized = false;
   let overlayHideTimer = null;
   let authMode = "signin";

   const $ = (selector, scope = document) => scope.querySelector(selector);
   const $$ = (selector, scope = document) =>
      Array.from(scope.querySelectorAll(selector));

   document.addEventListener("DOMContentLoaded", init);

   async function init() {
      cacheDom();
      setAuthMode("signin");
      switchView("now");
      attachEventListeners();
      initModal();
      setFooterYear();
      state.userBookings = loadLocalBookings();
      renderBookings();
      await initAuth();
      await loadPublicContent();
   }

   function cacheDom() {
      dom.views = $$(".view-section");
      dom.navItems = $$(".main-nav [data-view]");
      dom.footerNavItems = $$(".footer-links [data-view]");
      dom.adminNavLink = $(".main-nav [data-view='admin']");
      dom.authToggle = $("#authToggle");
      dom.brandTitle = $(".brand .logo");
      dom.brandTagline = $(".brand .tag");
      dom.heroCarousel = $("#heroCarousel");
      dom.heroSlides = $("#heroCarouselSlides");
      dom.heroDots = $("#heroCarouselDots");
      dom.heroPrev = $("#heroCarouselPrev");
      dom.heroNext = $("#heroCarouselNext");
      dom.moviesGrid = $("#moviesGrid");
      dom.comingGrid = $("#comingGrid");
      dom.bookingsContainer = $("#bookingsContainer");
      dom.bookingsAuthPrompt = $("#bookingsAuthPrompt");
      dom.modalOverlay = $("#modalOverlay");
      dom.modalContent = $("#modalContent");
      dom.closeModalBtn = $("#closeModal");
      dom.bgVideo = $("#bgVideo");
      dom.footerYear = $("#year");
      dom.movieTemplate = $("#movieCardTemplate");
      dom.ticketTemplate = $("#ticketTemplate");
      dom.adminLoginForm = $("#adminLoginForm");
      dom.adminAuthSubmit = $("#adminAuthSubmit");
      dom.adminLoginMessage = $("#adminAuthMessage");
      dom.adminDisplayNameGroup = $("#adminDisplayNameGroup");
      dom.adminDisplayName = $("#adminDisplayName");
      dom.adminToggleMode = $("#adminToggleMode");
      dom.adminSession = $("#adminSession");
      dom.adminUserEmail = $("#adminUserEmail");
      dom.adminSignOut = $("#adminSignOut");
      dom.adminRefresh = $("#adminRefreshData");
      dom.adminResetPassword = $("#adminResetPassword");
      dom.adminDashboard = $("#adminDashboard");
      dom.adminTabs = $$(".admin-tab");
      dom.adminPanels = $$(".admin-panel-section");
      dom.adminMovieForm = $("#adminMovieForm");
      dom.adminMovieFormMessage = $("#adminMovieFormMessage");
      dom.adminMovieFormReset = $("#adminMovieFormReset");
      dom.adminMoviesTable = $("#adminMoviesTable tbody");
      dom.adminCarouselForm = $("#adminCarouselForm");
      dom.adminCarouselFormMessage = $("#adminCarouselFormMessage");
      dom.adminCarouselFormReset = $("#adminCarouselFormReset");
      dom.adminCarouselTable = $("#adminCarouselTable tbody");
      dom.adminUpcomingForm = $("#adminUpcomingForm");
      dom.adminUpcomingFormMessage = $("#adminUpcomingFormMessage");
      dom.adminUpcomingFormReset = $("#adminUpcomingFormReset");
      dom.adminUpcomingTable = $("#adminUpcomingTable tbody");
      dom.adminMediaForm = $("#adminMediaUploadForm");
      dom.adminMediaMessage = $("#adminMediaMessage");
      dom.adminMediaReset = $("#adminMediaReset");
      dom.adminMediaTable = $("#adminMediaTable tbody");
      dom.adminConfigForm = $("#adminConfigForm");
      dom.adminConfigMessage = $("#adminConfigMessage");
      dom.adminConfigReset = $("#adminConfigReset");
      dom.adminBookingsTable = $("#adminBookingsTable tbody");
      dom.adminUsersTable = $("#adminUsersTable tbody");
   }

   function attachEventListeners() {
      [dom.navItems, dom.footerNavItems].filter(Array.isArray).forEach((group) => {
         group.forEach((item) => {
            item.addEventListener("click", (event) => {
               event.preventDefault();
               const targetView = item.dataset.view;
               if (!targetView) return;
               switchView(targetView);
               if (targetView === "bookings") {
                  renderBookings();
               }
            });
         });
      });

      dom.heroPrev?.addEventListener("click", () => stepHeroSlide(-1));
      dom.heroNext?.addEventListener("click", () => stepHeroSlide(1));
      dom.heroDots?.addEventListener("click", handleHeroDotClick);
      dom.heroCarousel?.addEventListener("mouseenter", () => {
         state.hero.isHovering = true;
         stopHeroCarouselCycle();
      });
      dom.heroCarousel?.addEventListener("mouseleave", () => {
         state.hero.isHovering = false;
         startHeroCarouselCycle();
      });
      dom.heroCarousel?.addEventListener("focusin", () => {
         state.hero.isFocusLocked = true;
         stopHeroCarouselCycle();
      });
      dom.heroCarousel?.addEventListener("focusout", (event) => {
         if (!dom.heroCarousel?.contains(event.relatedTarget)) {
            state.hero.isFocusLocked = false;
            startHeroCarouselCycle();
         }
      });

      dom.authToggle?.addEventListener("click", handleAuthToggle);

      dom.adminLoginForm?.addEventListener("submit", handleAdminAuthSubmit);
      dom.adminResetPassword?.addEventListener("click", handleAdminResetPassword);
      dom.adminSignOut?.addEventListener("click", signOut);
      dom.adminRefresh?.addEventListener("click", () => {
         if (state.isAdmin) loadAdminResources();
      });
      dom.adminToggleMode?.addEventListener("click", toggleAuthMode);

      dom.adminTabs.forEach((tab) => {
         tab.addEventListener("click", () => setActiveAdminTab(tab.dataset.adminTab));
      });

      dom.adminMovieForm?.addEventListener("submit", handleMovieFormSubmit);
      dom.adminMovieFormReset?.addEventListener("click", resetMovieForm);

      dom.adminCarouselForm?.addEventListener("submit", handleCarouselFormSubmit);
      dom.adminCarouselFormReset?.addEventListener("click", resetCarouselForm);

      dom.adminUpcomingForm?.addEventListener("submit", handleUpcomingFormSubmit);
      dom.adminUpcomingFormReset?.addEventListener("click", resetUpcomingForm);

      dom.adminMediaForm?.addEventListener("submit", handleMediaUpload);
      dom.adminMediaReset?.addEventListener("click", resetMediaForm);

      dom.adminConfigForm?.addEventListener("submit", handleConfigSubmit);
      dom.adminConfigReset?.addEventListener("click", resetConfigForm);

      dom.adminMoviesTable?.addEventListener("click", handleMoviesTableActions);
      dom.adminCarouselTable?.addEventListener("click", handleCarouselTableActions);
      dom.adminUpcomingTable?.addEventListener("click", handleUpcomingTableActions);
      dom.adminMediaTable?.addEventListener("click", handleMediaTableActions);
      dom.adminBookingsTable?.addEventListener("click", handleBookingsTableActions);
      dom.adminUsersTable?.addEventListener("click", handleUsersTableActions);

      window.addEventListener("storage", handleStorageChange);
   }

   async function initAuth() {
      if (isAuthInitialized) return;
      const stored = readStoredAuthState();

      if (stored && !isSessionExpired(stored.expiresAt)) {
         state.userId = stored.userId;
         state.sessionToken = stored.token;
         state.sessionExpiresAt = stored.expiresAt;
         persistAuthState();
         try {
            await refreshUserSession();
         } catch (error) {
            console.warn("Stored session refresh failed", error);
            resetAuthState({ reason: "invalid" });
         }
      } else {
         if (stored) {
            console.info("Stored session expired, clearing persisted auth state.");
            resetAuthState({ reason: "expired" });
         } else {
            resetAuthState();
         }
      }
      isAuthInitialized = true;
      updateAuthUI();

      if (state.user) {
         await loadUserBookings();
         if (state.isAdmin) {
            await loadAdminResources();
         }
      } else {
         state.userBookings = loadLocalBookings();
         renderBookings();
      }
   }

   async function refreshUserSession() {
      if (!state.sessionToken || !state.sessionExpiresAt) {
         resetAuthState({ reason: "missing" });
         return;
      }

      if (isSessionExpired(state.sessionExpiresAt)) {
         resetAuthState({
            reason: "expired",
            message: "Your session expired. Please sign in again.",
            isError: true,
         });
         return;
      }

      try {
         const user = await safeFetch("/auth/me");
         if (user) {
            updateAuthState(user);
         }
      } catch (error) {
         console.warn("Session refresh failed", error);
         if (state.sessionToken) {
            resetAuthState({
               reason: "invalid",
               message: "We couldn't restore your session. Please sign in again.",
               isError: true,
            });
         }
      }
   }

   function updateAuthState(user, session) {
      if (session) {
         state.sessionToken = typeof session.token === "string" ? session.token : null;
         state.sessionExpiresAt = session.expiresAt
            ? new Date(session.expiresAt).toISOString()
            : null;
      }

      if (user) {
         state.user = user;
         state.userId = user.id || null;
      } else if (!session) {
         state.user = null;
         state.userId = null;
         state.sessionToken = null;
         state.sessionExpiresAt = null;
      }

      state.isAdmin = state.user?.role === "admin";
      persistAuthState();
   }

   async function revokeSession() {
      if (!state.sessionToken) return;
      try {
         const response = await fetch(`${API_BASE_URL}/auth/session`, {
            method: "DELETE",
            headers: {
               "x-session-token": state.sessionToken,
            },
         });
         if (!response.ok && response.status !== 404 && response.status !== 401) {
            console.warn("Unexpected response while revoking session", response.status);
         }
      } catch (error) {
         console.warn("Failed to revoke session", error);
      }
   }

   function resetAuthState({ message = "", isError = false, reason } = {}) {
      state.user = null;
      state.userId = null;
      state.sessionToken = null;
      state.sessionExpiresAt = null;
      state.isAdmin = false;
      persistAuthState();

      state.admin = {
         movies: [],
         upcoming: [],
         carousel: [],
         media: [],
         users: [],
      };
      state.editing = {
         movieId: null,
         upcomingId: null,
         carouselId: null,
      };

      updateAuthUI();
      setAuthMode("signin");

      state.userBookings = [];
      renderBookings();

      if (dom.adminLoginMessage && message) {
         setFormMessage(dom.adminLoginMessage, message, isError);
      } else if (dom.adminLoginMessage && reason === "expired") {
         setFormMessage(
            dom.adminLoginMessage,
            "Session expired. Please sign in again.",
            true
         );
      } else if (dom.adminLoginMessage && reason === "invalid") {
         setFormMessage(dom.adminLoginMessage, "Please sign in to continue.", true);
      } else if (dom.adminLoginMessage && !isError) {
         setFormMessage(dom.adminLoginMessage, "");
      }
   }

   async function signOut(options = {}) {
      const { silent = false } = options;
      await revokeSession();
      resetAuthState({ message: silent ? "" : "You have been signed out." });
   }

   function handleAuthToggle() {
      if (state.user) {
         signOut({ silent: true }).catch((error) =>
            console.warn("Sign-out failed", error)
         );
      } else {
         setAuthMode("signin");
         switchView("admin");
         $("#adminEmail")?.focus();
      }
   }

   function toggleAuthMode() {
      const nextMode = authMode === "signin" ? "signup" : "signin";
      setAuthMode(nextMode);
   }

   function setAuthMode(mode = "signin") {
      authMode = mode === "signup" ? "signup" : "signin";
      const isSignup = authMode === "signup";

      dom.adminLoginForm?.setAttribute("data-auth-mode", authMode);
      dom.adminDisplayNameGroup?.classList.toggle("hidden", !isSignup);

      if (dom.adminAuthSubmit) {
         dom.adminAuthSubmit.textContent = isSignup ? "Sign Up" : "Sign In";
      }

      if (dom.adminToggleMode) {
         dom.adminToggleMode.textContent = isSignup
            ? "Have an account? Sign in"
            : "Need an account? Sign up";
      }

      if (dom.adminResetPassword) {
         dom.adminResetPassword.classList.toggle("hidden", isSignup);
      }

      if (!state.user) {
         setFormMessage(dom.adminLoginMessage, "");
      }
   }

   async function handleAdminAuthSubmit(event) {
      event.preventDefault();
      if (!dom.adminLoginForm) return;

      const formData = new FormData(dom.adminLoginForm);
      const emailRaw = formData.get("email");
      const passwordRaw = formData.get("password");
      const displayNameRaw = formData.get("displayName");

      const email = typeof emailRaw === "string" ? emailRaw.trim() : "";
      const password = typeof passwordRaw === "string" ? passwordRaw : "";
      const displayName = typeof displayNameRaw === "string" ? displayNameRaw.trim() : "";

      if (!email || !password) {
         setFormMessage(dom.adminLoginMessage, "Email and password are required.", true);
         return;
      }

      const payload = { email, password };
      if (authMode === "signup" && displayName) {
         payload.displayName = displayName;
      }

      const endpoint = authMode === "signup" ? "/auth/register" : "/auth/login";
      setFormMessage(
         dom.adminLoginMessage,
         authMode === "signup" ? "Creating account..." : "Signing in...",
         false
      );

      dom.adminAuthSubmit?.setAttribute("disabled", "disabled");
      dom.adminToggleMode?.setAttribute("disabled", "disabled");

      try {
         const result = await safeFetch(endpoint, {
            method: "POST",
            body: JSON.stringify(payload),
         });

         updateAuthState(result?.user || null, result?.session || null);
         dom.adminLoginForm.reset();
         setFormMessage(dom.adminLoginMessage, "");
         updateAuthUI();
         await loadUserBookings();
         if (state.isAdmin) {
            await loadAdminResources();
         }

         // Show success toast
         showToast(
            authMode === "signup"
               ? "Account created successfully! Welcome aboard."
               : "Signed in successfully! Welcome back.",
            "success"
         );
      } catch (error) {
         console.error(error);
         const errorMsg =
            error.message ||
            (authMode === "signup" ? "Unable to sign up." : "Unable to sign in.");
         setFormMessage(dom.adminLoginMessage, errorMsg, true);

         // Show error toast
         showToast(errorMsg, "error");
      } finally {
         dom.adminAuthSubmit?.removeAttribute("disabled");
         dom.adminToggleMode?.removeAttribute("disabled");
      }
   }

   async function handleAdminResetPassword(event) {
      event?.preventDefault();
      setFormMessage(
         dom.adminLoginMessage,
         "Password resets are not automated yet. Please contact support to reset your password.",
         true
      );
   }

   function setActiveAdminTab(tabId = "movies") {
      dom.adminTabs.forEach((tab) => {
         tab.classList.toggle("active", tab.dataset.adminTab === tabId);
      });
      dom.adminPanels.forEach((panel) => {
         panel.classList.toggle("hidden", panel.dataset.adminPanel !== tabId);
      });
   }

   function switchView(view) {
      const showHero = view === "now";
      if (dom.heroCarousel) {
         dom.heroCarousel.classList.toggle("hidden", !showHero);
         if (!showHero) {
            stopHeroCarouselCycle();
         } else if (!state.hero.isHovering && !state.hero.isFocusLocked) {
            startHeroCarouselCycle();
         }
      }

      dom.views.forEach((section) => {
         const isTarget = section.id === `view-${view}`;
         if (isTarget) {
            section.classList.remove("hidden");
            section.classList.remove("view-enter");
            // Force reflow so the animation retriggers when switching views repeatedly.
            // eslint-disable-next-line no-unused-expressions
            section.offsetWidth;
            section.classList.add("view-enter");
         } else {
            section.classList.add("hidden");
            section.classList.remove("view-enter");
         }
      });
      refreshNavActive(view);
   }

   function refreshNavActive(activeView) {
      dom.navItems.forEach((item) => {
         item.classList.toggle("active", item.dataset.view === activeView);
      });
   }

   function setFooterYear() {
      if (dom.footerYear) dom.footerYear.textContent = new Date().getFullYear();
   }

   function initModal() {
      if (!dom.modalOverlay || !dom.modalContent || !dom.closeModalBtn) return;
      dom.closeModalBtn.addEventListener("click", closeModal);
      dom.modalOverlay.addEventListener("click", (event) => {
         if (event.target === dom.modalOverlay) closeModal();
      });
   }

   function openModal(content) {
      if (!dom.modalOverlay || !dom.modalContent) return;
      if (overlayHideTimer) {
         clearTimeout(overlayHideTimer);
         overlayHideTimer = null;
      }
      dom.modalContent.innerHTML = "";
      if (typeof content === "string") {
         dom.modalContent.innerHTML = content;
      } else if (content instanceof Node) {
         dom.modalContent.appendChild(content);
      }
      dom.modalOverlay.classList.remove("hidden");
      dom.modalOverlay.classList.remove("show");
      requestAnimationFrame(() => dom.modalOverlay.classList.add("show"));
      trapFocus(dom.modalOverlay);
   }

   function closeModal() {
      if (!dom.modalOverlay) return;
      dom.modalOverlay.classList.remove("show");
      if (overlayHideTimer) clearTimeout(overlayHideTimer);
      overlayHideTimer = setTimeout(() => {
         dom.modalOverlay?.classList.add("hidden");
         if (dom.modalContent) dom.modalContent.innerHTML = "";
         overlayHideTimer = null;
      }, 220);
   }

   function trapFocus(container) {
      if (!container) return;
      const focusable = container.querySelector(
         'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      focusable?.focus();
   }

   function updateAuthUI() {
      if (dom.authToggle) {
         dom.authToggle.textContent = state.user ? "Sign Out" : "Sign In";
      }
      if (dom.adminNavLink) {
         dom.adminNavLink.classList.toggle("hidden", !state.isAdmin);
      }
      if (!dom.adminLoginForm || !dom.adminSession || !dom.adminDashboard) return;

      if (state.user) {
         dom.adminLoginForm.classList.add("hidden");
         dom.adminSession.classList.remove("hidden");
         dom.adminUserEmail.textContent = state.user.email || "";
         dom.adminDashboard.classList.toggle("hidden", !state.isAdmin);
         if (!state.isAdmin) {
            setFormMessage(
               dom.adminLoginMessage,
               "Signed in, but you do not have administrator privileges.",
               true
            );
         } else {
            setFormMessage(dom.adminLoginMessage, "");
         }
      } else {
         dom.adminLoginForm.classList.remove("hidden");
         dom.adminSession.classList.add("hidden");
         dom.adminDashboard.classList.add("hidden");
         setFormMessage(dom.adminLoginMessage, "");
      }

      togglePosterUploadButtons();
   }

   function togglePosterUploadButtons() {
      const buttons = $$(".upload-poster");
      buttons.forEach((button) => {
         if (state.isAdmin) {
            button.classList.remove("hidden");
            button.removeAttribute("disabled");
            if (!button.dataset.bound) {
               button.addEventListener("click", (event) => {
                  event.preventDefault();
                  switchView("admin");
                  setActiveAdminTab("media");
                  const movieId = button.closest("[data-movie-id]")?.dataset.movieId;
                  const movieIdField =
                     dom.adminMediaForm?.elements?.namedItem?.("movieId");
                  if (movieId && movieIdField) {
                     movieIdField.value = movieId;
                  }
               });
               button.dataset.bound = "1";
            }
         } else {
            button.classList.add("hidden");
            button.setAttribute("disabled", "disabled");
         }
      });
   }

   async function loadPublicContent() {
      try {
         const [config, movies, upcoming, carousel] = await Promise.all([
            safeFetch("/config").catch(() => FALLBACK_CONFIG),
            safeFetch("/movies").catch(() => FALLBACK_MOVIES),
            safeFetch("/upcoming").catch(() => FALLBACK_UPCOMING),
            safeFetch("/carousel").catch(() => null),
         ]);

         state.config = config && typeof config === "object" ? config : FALLBACK_CONFIG;
         state.movies = Array.isArray(movies) && movies.length ? movies : FALLBACK_MOVIES;
         state.upcoming =
            Array.isArray(upcoming) && upcoming.length ? upcoming : FALLBACK_UPCOMING;
         state.carousel =
            Array.isArray(carousel) && carousel.length ? carousel : FALLBACK_CAROUSEL;

         state.hero.items = [...state.carousel];

         if (state.config?.seatMultipliers) {
            state.seatMultipliers = {
               ...FALLBACK_SEAT_MULTIPLIERS,
               ...state.config.seatMultipliers,
            };
         }

         applyConfig(state.config);
         renderHeroCarousel();
         renderMovies();
         renderComingSoon();

         if (state.isAdmin) {
            populateConfigForm();
            renderAdminTables();
         }
      } catch (error) {
         console.error("Failed to load public content", error);
         state.config = FALLBACK_CONFIG;
         state.movies = FALLBACK_MOVIES;
         state.upcoming = FALLBACK_UPCOMING;
         state.carousel = FALLBACK_CAROUSEL;
         state.hero.items = [...state.carousel];
         applyConfig(state.config);
         renderHeroCarousel();
         renderMovies();
         renderComingSoon();
      }
   }

   function applyConfig(config) {
      if (!config) return;
      if (dom.brandTitle && config.brandTitle)
         dom.brandTitle.textContent = config.brandTitle;
      if (dom.brandTagline && config.tagline)
         dom.brandTagline.textContent = config.tagline;
      if (dom.bgVideo && config.backgroundVideoUrl) {
         dom.bgVideo.src = config.backgroundVideoUrl;
      }
      if (config.seatMultipliers) {
         state.seatMultipliers = {
            ...FALLBACK_SEAT_MULTIPLIERS,
            ...config.seatMultipliers,
         };
      }
   }

   function renderMovies() {
      if (!dom.moviesGrid) return;
      dom.moviesGrid.innerHTML = "";
      const template = dom.movieTemplate?.content;
      const visibleMovies = (state.movies || []).filter(
         (movie) => (movie.status || "published") !== "archived"
      );

      if (!template || !visibleMovies.length) {
         renderEmptyState(dom.moviesGrid, "No movies available at the moment.");
         return;
      }

      visibleMovies.forEach((movie) => {
         const clone = document.importNode(template, true);
         const card = clone.querySelector(".movie-card");
         const poster = clone.querySelector(".poster");
         const posterImg = clone.querySelector(".poster-img");
         const posterTitle = clone.querySelector(".poster-title");
         const title = clone.querySelector(".movie-title");
         const meta = clone.querySelector(".meta");
         const selectSeatsBtn = clone.querySelector(".select-seats");
         const viewDetailsBtn = clone.querySelector(".view-details");

         const movieId = movie.id || movie._id;
         if (card) card.dataset.movieId = movieId;

         if (posterTitle) posterTitle.textContent = movie.title || "Untitled";

         if (posterImg) {
            if (movie.posterUrl) {
               posterImg.src = movie.posterUrl;
               posterImg.alt = `${movie.title || "Movie"} poster`;
               posterImg.classList.add("loaded");
            } else {
               const colors = Array.isArray(movie.posterColor)
                  ? movie.posterColor
                  : ["#3a7bd5", "#00d2ff"];
               poster.style.backgroundImage = `linear-gradient(180deg, ${colors[0]}, ${colors[1]})`;
            }
         }

         if (title) title.textContent = movie.title || "Untitled";

         if (meta) {
            const pieces = [];
            if (movie.runtime) pieces.push(movie.runtime);
            if (movie.rating) pieces.push(movie.rating);
            if (typeof movie.price === "number") pieces.push(formatCurrency(movie.price));
            meta.textContent = pieces.join(" • ");
         }

         selectSeatsBtn?.addEventListener("click", () => openSeatModal(movie));
         viewDetailsBtn?.addEventListener("click", () => openDetailsModal(movie));

         dom.moviesGrid.appendChild(clone);
      });

      togglePosterUploadButtons();
   }

   function renderComingSoon() {
      if (!dom.comingGrid) return;
      dom.comingGrid.innerHTML = "";
      const items = state.upcoming || [];

      if (!items.length) {
         renderEmptyState(dom.comingGrid, "Upcoming releases will appear here soon.");
         return;
      }

      items.forEach((item) => {
         const card = document.createElement("article");
         card.className = "movie-card";

         // Use poster image if available, otherwise use gradient
         const posterStyle = item.posterUrl
            ? `background-image: url('${item.posterUrl}'); background-size: cover; background-position: center;`
            : (() => {
                 const colors = Array.isArray(item.posterColor)
                    ? item.posterColor
                    : ["#3a7bd5", "#00d2ff"];
                 return `background-image: linear-gradient(180deg, ${colors[0]}, ${colors[1]});`;
              })();

         card.innerHTML = `
               <div class="poster" style="${posterStyle}">
                  ${
                     item.posterUrl
                        ? `<img class="poster-img" src="${item.posterUrl}" alt="${
                             item.title || "Upcoming movie"
                          }" />`
                        : ""
                  }
                  <div class="poster-title">${item.title || "Untitled"}</div>
               </div>
               <div class="card-body">
                  <h3 class="movie-title">${item.title || "Untitled"}</h3>
                  <p class="meta">${formatDate(item.releaseDate) || "TBA"}</p>
                  ${item.summary ? `<p class="movie-synopsis">${item.summary}</p>` : ""}
               </div>
            `;
         dom.comingGrid.appendChild(card);
      });
   }

   function renderHeroCarousel() {
      if (!dom.heroSlides || !dom.heroCarousel) return;

      stopHeroCarouselCycle();
      state.hero.isHovering = false;
      state.hero.isFocusLocked = false;
      dom.heroSlides.innerHTML = "";
      if (dom.heroDots) {
         dom.heroDots.innerHTML = "";
      }

      const items =
         Array.isArray(state.carousel) && state.carousel.length
            ? state.carousel
            : FALLBACK_CAROUSEL;
      state.hero.items = items.slice();

      if (!items.length) {
         dom.heroCarousel.classList.add("hidden");
         return;
      }

      dom.heroCarousel.classList.remove("hidden");

      items.forEach((slideData, index) => {
         const slide = document.createElement("article");
         slide.className = "hero-slide";
         slide.dataset.index = String(index);

         const linkedMovie = findMovieById(slideData.movieId);

         const posterUrl = slideData.posterUrl || linkedMovie?.posterUrl;
         const colors =
            Array.isArray(slideData.posterColor) && slideData.posterColor.length >= 2
               ? slideData.posterColor
               : Array.isArray(linkedMovie?.posterColor) &&
                 linkedMovie.posterColor.length >= 2
               ? linkedMovie.posterColor
               : ["#0f172a", "#111827"];
         slide.style.backgroundImage = `linear-gradient(135deg, ${colors[0]}, ${colors[1]})`;
         slide.style.backgroundSize = "cover";
         slide.style.backgroundPosition = "center";
         slide.style.backgroundRepeat = "no-repeat";

         slide.innerHTML = "";

         const posterContainer = document.createElement("div");
         posterContainer.className = "hero-slide__poster";

         if (posterUrl) {
            const img = document.createElement("img");
            img.className = "hero-slide__poster-img";
            img.src = posterUrl;
            img.alt = `${slideData.title || linkedMovie?.title || "Featured"} poster`;
            posterContainer.appendChild(img);
         } else {
            const placeholder = document.createElement("div");
            placeholder.className = "hero-slide__poster-placeholder";
            placeholder.style.backgroundImage = `linear-gradient(135deg, ${colors[0]}, ${colors[1]})`;
            posterContainer.appendChild(placeholder);
         }

         slide.appendChild(posterContainer);

         dom.heroSlides.appendChild(slide);

         if (dom.heroDots) {
            const dot = document.createElement("button");
            dot.type = "button";
            dot.className = "hero-carousel__dot";
            dot.dataset.index = String(index);
            dot.setAttribute(
               "aria-label",
               `Show ${slideData.title ? slideData.title : "featured highlight"}`
            );
            dom.heroDots.appendChild(dot);
         }
      });

      const showNavigation = items.length > 1;
      if (dom.heroPrev) {
         dom.heroPrev.classList.toggle("hidden", !showNavigation);
      }
      if (dom.heroNext) {
         dom.heroNext.classList.toggle("hidden", !showNavigation);
      }
      if (dom.heroDots) {
         dom.heroDots.classList.toggle("hidden", !showNavigation);
      }

      setHeroSlide(Math.min(state.hero.activeIndex, items.length - 1), false);
      startHeroCarouselCycle();
   }

   function findMovieById(movieId) {
      if (!movieId) return null;
      const target = String(movieId);
      return (
         state.movies.find((movie) => {
            const identifier = movie.id ?? movie._id;
            return identifier && String(identifier) === target;
         }) || null
      );
   }

   function handleHeroDotClick(event) {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      if (!target.classList.contains("hero-carousel__dot")) return;
      const index = Number.parseInt(target.dataset.index || "", 10);
      if (!Number.isFinite(index)) return;
      setHeroSlide(index);
   }

   function stepHeroSlide(offset = 1) {
      if (!Number.isFinite(offset)) return;
      setHeroSlide(state.hero.activeIndex + offset);
   }

   function setHeroSlide(index, restartTimer = true) {
      if (!dom.heroSlides) return;
      const slides = $$(".hero-slide", dom.heroSlides);
      if (!slides.length) return;
      const total = slides.length;
      const normalized = ((index % total) + total) % total;
      state.hero.activeIndex = normalized;

      slides.forEach((slide, slideIndex) => {
         const isActive = slideIndex === normalized;
         slide.classList.toggle("is-active", isActive);
         slide.setAttribute("aria-hidden", isActive ? "false" : "true");
      });

      const dots = dom.heroDots ? $$(".hero-carousel__dot", dom.heroDots) : [];
      dots.forEach((dot, dotIndex) => {
         const isActive = dotIndex === normalized;
         dot.classList.toggle("is-active", isActive);
         dot.setAttribute("aria-pressed", isActive ? "true" : "false");
      });

      if (restartTimer && !state.hero.isHovering && !state.hero.isFocusLocked) {
         restartHeroCarouselCycle();
      }
   }

   function startHeroCarouselCycle() {
      if ((state.hero.items || []).length <= 1) return;
      if (state.hero.isHovering || state.hero.isFocusLocked) return;
      if (state.hero.timerId) return;
      state.hero.timerId = window.setInterval(() => {
         setHeroSlide(state.hero.activeIndex + 1, false);
      }, 7000);
   }

   function stopHeroCarouselCycle() {
      if (state.hero.timerId) {
         window.clearInterval(state.hero.timerId);
         state.hero.timerId = null;
      }
   }

   function restartHeroCarouselCycle() {
      stopHeroCarouselCycle();
      startHeroCarouselCycle();
   }

   function renderEmptyState(container, message) {
      if (!container) return;
      const el = document.createElement("p");
      el.className = "empty-state";
      el.textContent = message;
      container.appendChild(el);
   }

   function openDetailsModal(movie) {
      const detailRows = [
         ["Genres", asList(movie.genres || movie.genre)],
         ["Director", movie.director],
         ["Producer", movie.producer],
         ["Cast", asList(movie.cast)],
         ["Release Year", movie.releaseYear],
         ["IMDb Rating", movie.imdbRating ? `${movie.imdbRating}/10` : null],
      ].filter(([, value]) => value);

      const metaParts = [];
      if (movie.runtime) metaParts.push(movie.runtime);
      if (movie.rating) metaParts.push(movie.rating);
      if (typeof movie.price === "number") metaParts.push(formatCurrency(movie.price));

      const wrapper = document.createElement("div");
      wrapper.className = "details-modal";
      wrapper.innerHTML = `
            <header class="details-header">
               <div class="details-header-text">
                  <h2 class="details-title">${movie.title || "Untitled"}</h2>
                  ${
                     metaParts.length
                        ? `<p class="details-meta">${metaParts.join(" • ")}</p>`
                        : ""
                  }
               </div>
            </header>
            <p class="details-synopsis">${
               movie.synopsis || "No synopsis available yet."
            }</p>
            ${
               detailRows.length
                  ? `<section class="details-section"><h3 class="details-subtitle">Key details</h3><div class="details-grid">${detailRows
                       .map(
                          ([label, value]) =>
                             `<div class="detail-label">${label}</div><div class="detail-value">${value}</div>`
                       )
                       .join("")}</div></section>`
                  : ""
            }
            ${
               Array.isArray(movie.showtimes) && movie.showtimes.length
                  ? `<section class="details-section"><h3 class="details-subtitle">Showtimes</h3>
                        <div class="details-showtimes-inline">
                           ${movie.showtimes
                              .map((time) => `<span class="showtime-chip">${time}</span>`)
                              .join("")}
                        </div>
                     </section>`
                  : ""
            }
         `;
      openModal(wrapper);
   }

   function openSeatModal(movie) {
      if (!Array.isArray(movie.showtimes) || !movie.showtimes.length) {
         alert("No showtimes available for this movie yet.");
         return;
      }

      const seatMultipliers = {
         front: toNumber(movie.multiplierFront) || state.seatMultipliers.front,
         middle: toNumber(movie.multiplierMiddle) || state.seatMultipliers.middle,
         back: toNumber(movie.multiplierBack) || state.seatMultipliers.back,
      };

      const container = document.createElement("div");
      container.className = "seat-modal";
      container.innerHTML = `
            <header class="modal-header">
               <h2>${movie.title || "Select seats"}</h2>
               <p class="meta">Base price ${formatCurrency(movie.price || 0)}</p>
            </header>
            <div class="seat-modal-body">
               <div class="seat-showtimes" role="group" aria-label="Showtimes"></div>
               <div class="seat-legend">
                  <div class="legend-item"><span class="legend-swatch legend-front"></span> Front (premium)</div>
                  <div class="legend-item"><span class="legend-swatch legend-middle"></span> Middle</div>
                  <div class="legend-item"><span class="legend-swatch legend-back"></span> Back (economy)</div>
               </div>
               <div class="seats-grid" aria-live="polite"></div>
            </div>
            <footer class="modal-footer">
               <div class="modal-summary">Pick a showtime to begin.</div>
               <div class="modal-actions">
                  <button type="button" class="btn btn-ghost modal-cancel">Cancel</button>
                  <button type="button" class="btn btn-primary modal-confirm">Confirm Booking</button>
               </div>
            </footer>
         `;

      const showtimeList = container.querySelector(".seat-showtimes");
      const seatsGrid = container.querySelector(".seats-grid");
      const summary = container.querySelector(".modal-summary");
      const cancelBtn = container.querySelector(".modal-cancel");
      const confirmBtn = container.querySelector(".modal-confirm");

      let currentShowtime = null;
      const selectedSeats = new Map();

      cancelBtn?.addEventListener("click", closeModal);

      confirmBtn?.addEventListener("click", async () => {
         if (!state.user) {
            alert("Please sign in to book seats.");
            closeModal();
            switchView("admin");
            return;
         }

         if (!currentShowtime) {
            alert("Select a showtime first.");
            return;
         }
         if (!selectedSeats.size) {
            alert("Select at least one seat.");
            return;
         }

         confirmBtn.disabled = true;
         confirmBtn.textContent = "Saving...";
         const seatList = Array.from(selectedSeats.entries()).map(([seat, info]) => ({
            seat,
            zone: info.zone,
            price: info.price,
         }));
         try {
            await submitBooking(movie, currentShowtime, seatList);
            markSeatsAsBooked(
               movie.id || movie._id,
               currentShowtime,
               seatList.map((item) => item.seat)
            );
            await loadUserBookings();
            closeModal();

            // Show success toast
            showToast(
               `Successfully booked ${seatList.length} seat${
                  seatList.length > 1 ? "s" : ""
               } for ${movie.title}!`,
               "success"
            );
         } catch (error) {
            console.warn("Booking failed:", error);
            const errorMsg = "Unable to complete booking. Please try again.";
            alert(errorMsg);

            // Show error toast
            showToast(errorMsg, "error");
         } finally {
            confirmBtn.disabled = false;
            confirmBtn.textContent = "Confirm Booking";
         }
      });

      movie.showtimes.forEach((time, index) => {
         const button = document.createElement("button");
         button.type = "button";
         button.className = "showtime";
         button.textContent = time;
         button.addEventListener("click", () => selectShowtime(time, button));
         showtimeList?.appendChild(button);
         if (index === 0) {
            selectShowtime(time, button);
         }
      });

      openModal(container);

      async function selectShowtime(time, button) {
         currentShowtime = time;
         selectedSeats.clear();
         updateSummary();
         $$(".showtime", showtimeList).forEach((btn) => btn.classList.remove("selected"));
         button?.classList.add("selected");
         await renderSeats(time);
      }

      async function renderSeats(showtime) {
         if (!seatsGrid) return;
         seatsGrid.innerHTML = `<p class="muted">Loading seats...</p>`;
         const availability = await loadAvailability(movie.id || movie._id, showtime);
         if (currentShowtime !== showtime) return;

         const layout = availability?.layout || FALLBACK_SEAT_LAYOUT;
         const booked = new Set(
            (availability?.seats?.booked || availability?.booked || []).filter(
               (seat) => typeof seat === "string"
            )
         );
         seatsGrid.innerHTML = "";

         for (let row = 0; row < layout.rows; row += 1) {
            for (let col = 0; col < layout.cols; col += 1) {
               const seatId = `${String.fromCharCode(65 + row)}${col + 1}`;
               const seatButton = document.createElement("button");
               seatButton.type = "button";
               seatButton.className = "seat";
               seatButton.textContent = seatId;

               const zone =
                  row <= 1 ? "front" : row >= layout.rows - 2 ? "back" : "middle";
               seatButton.dataset.zone = zone;
               seatButton.classList.add(zone);
               const price = +(
                  Number(movie.price || 0) * (seatMultipliers[zone] || 1)
               ).toFixed(2);
               seatButton.dataset.price = String(price);
               seatButton.dataset.seat = seatId;

               const isBooked = booked.has(seatId);
               seatButton.dataset.state = isBooked ? "booked" : "available";
               seatButton.setAttribute("aria-pressed", "false");
               seatButton.setAttribute(
                  "aria-label",
                  `${seatId} ${zone} section ${isBooked ? "booked" : "available"}`
               );

               if (isBooked) {
                  seatButton.classList.add("booked");
                  seatButton.disabled = true;
                  seatButton.setAttribute("aria-disabled", "true");
               } else {
                  seatButton.classList.add("available");
                  seatButton.setAttribute("aria-disabled", "false");
                  seatButton.addEventListener("click", () => toggleSeat(seatButton));
               }

               seatsGrid.appendChild(seatButton);
            }
         }
      }

      function toggleSeat(seatButton) {
         const seatId = seatButton.dataset.seat;
         if (!seatId || seatButton.disabled || seatButton.classList.contains("booked")) {
            return;
         }
         if (selectedSeats.has(seatId)) {
            selectedSeats.delete(seatId);
            seatButton.classList.remove("selected");
         } else {
            selectedSeats.set(seatId, {
               zone: seatButton.dataset.zone || "middle",
               price: parseFloat(seatButton.dataset.price || "0"),
            });
            seatButton.classList.add("selected");
         }
         const isSelected = seatButton.classList.contains("selected");
         seatButton.classList.toggle("available", !isSelected);
         seatButton.dataset.state = isSelected ? "selected" : "available";
         seatButton.classList.toggle("is-active", isSelected);
         seatButton.setAttribute("aria-pressed", isSelected ? "true" : "false");
         seatButton.setAttribute(
            "aria-label",
            `${seatId} ${(seatButton.dataset.zone || "middle").toLowerCase()} section ${
               isSelected ? "selected" : "available"
            }`
         );
         updateSummary();
      }

      function updateSummary() {
         if (!summary) return;
         if (!currentShowtime) {
            summary.textContent = "Pick a showtime to begin.";
            return;
         }
         if (!selectedSeats.size) {
            summary.textContent = "Select one or more seats.";
            return;
         }
         let total = 0;
         const pieces = [];
         selectedSeats.forEach((info, seatId) => {
            total += info.price;
            pieces.push(`${seatId} (${info.zone})`);
         });
         summary.textContent = `${selectedSeats.size} seat(s) • ${formatCurrency(
            total
         )} — ${pieces.join(", ")}`;
      }
   }

   async function loadAvailability(movieId, showtime) {
      const cacheKey = `${movieId}::${showtime}`;
      if (localSeatCache.has(cacheKey)) {
         return localSeatCache.get(cacheKey);
      }
      try {
         const result = await safeFetch(
            `/movies/${movieId}/availability?showtime=${encodeURIComponent(showtime)}`
         );
         if (result) {
            const normalized = normalizeSeatAvailabilityPayload(result);
            localSeatCache.set(cacheKey, normalized);
            return normalized;
         }
      } catch (error) {
         console.warn("Falling back to local seat availability", error);
      }
      const fallback = buildFallbackAvailability(movieId, showtime);
      localSeatCache.set(cacheKey, fallback);
      return fallback;
   }

   function buildFallbackAvailability(movieId, showtime) {
      const bookings = loadLocalBookings().filter(
         (booking) => booking.movieId === movieId && booking.showtime === showtime
      );
      const booked = new Set();
      bookings.forEach((booking) => {
         (booking.seats || []).forEach((seat) => {
            if (seat && typeof seat === "object" && typeof seat.seat === "string") {
               booked.add(seat.seat);
            } else if (typeof seat === "string") {
               booked.add(seat);
            }
         });
      });
      return normalizeSeatAvailabilityPayload({
         layout: FALLBACK_SEAT_LAYOUT,
         booked: Array.from(booked),
      });
   }

   function markSeatsAsBooked(movieId, showtime, seatIds) {
      const key = `${movieId}::${showtime}`;
      const cached =
         localSeatCache.get(key) || buildFallbackAvailability(movieId, showtime);
      const booked = new Set(
         (cached?.seats?.booked || cached?.booked || []).filter(
            (seat) => typeof seat === "string"
         )
      );
      seatIds.forEach((seat) => {
         if (typeof seat === "string") {
            booked.add(seat);
         }
      });
      const normalized = normalizeSeatAvailabilityPayload({
         layout: cached.layout || FALLBACK_SEAT_LAYOUT,
         booked: Array.from(booked),
      });
      localSeatCache.set(key, normalized);
   }

   async function submitBooking(movie, showtime, seatList) {
      const payload = {
         movieId: movie.id || movie._id,
         showtime,
         seats: seatList,
      };
      await safeFetch("/bookings", {
         method: "POST",
         body: JSON.stringify(payload),
      });
   }

   function createLocalTicketsFromSelection(movie, showtime, seatList) {
      const timestamp = Date.now();
      const now = new Date().toISOString();
      return seatList.map((item, index) => ({
         id: `local-${movie.id || movie._id}-${showtime}-${item.seat}-${
            timestamp + index
         }`,
         movieId: movie.id || movie._id,
         movieTitle: movie.title,
         showtime,
         seats: [item.seat],
         seatZones: [item.zone],
         totalPrice: item.price,
         posterColor: movie.posterColor,
         createdAt: now,
         source: "local",
      }));
   }

   function appendLocalBookings(bookings) {
      if (!Array.isArray(bookings) || !bookings.length) return;
      try {
         const existing = loadLocalBookings();
         const updated = existing.concat(bookings);
         localStorage.setItem(LOCAL_BOOKINGS_KEY, JSON.stringify(updated));
      } catch (error) {
         console.warn("Unable to persist booking locally", error);
      }
   }

   function loadLocalBookings() {
      try {
         const stored = JSON.parse(localStorage.getItem(LOCAL_BOOKINGS_KEY) || "[]");
         return Array.isArray(stored) ? stored : [];
      } catch (error) {
         console.warn("Failed to read local bookings", error);
         return [];
      }
   }

   function handleStorageChange(event) {
      if (event.key === LOCAL_BOOKINGS_KEY && !state.user) {
         state.userBookings = loadLocalBookings();
         renderBookings();
      }
   }

   async function loadUserBookings() {
      if (!state.user) {
         state.userBookings = [];
         renderBookings();
         return;
      }
      try {
         const bookings = await safeFetch("/bookings");
         state.userBookings = Array.isArray(bookings) ? bookings : [];
      } catch (error) {
         console.error("Unable to load remote bookings", error);
         state.userBookings = [];
      }
      renderBookings();
   }

   function renderBookings() {
      if (!dom.bookingsContainer) return;
      dom.bookingsContainer.innerHTML = "";

      // Show auth prompt if user is not signed in
      if (!state.user) {
         if (dom.bookingsAuthPrompt) {
            dom.bookingsAuthPrompt.classList.remove("hidden");
            dom.bookingsAuthPrompt.innerHTML = `
               <p style="margin: 0 0 12px;">Sign in to view and manage your bookings.</p>
               <button class="btn btn-primary" onclick="document.querySelector('[data-view=\\'admin\\']').click()">
                  Sign In
               </button>
            `;
         }
         renderEmptyState(
            dom.bookingsContainer,
            "Please sign in to access your bookings."
         );
         return;
      }

      // User is signed in - hide auth prompt
      if (dom.bookingsAuthPrompt) {
         dom.bookingsAuthPrompt.classList.add("hidden");
         dom.bookingsAuthPrompt.textContent = "";
      }

      // Show bookings if user has any
      if (!state.userBookings.length) {
         renderEmptyState(
            dom.bookingsContainer,
            "No bookings yet. Pick a movie to get started."
         );
         return;
      }

      const template = dom.ticketTemplate?.content;
      state.userBookings.forEach((booking) => {
         if (template) {
            const clone = document.importNode(template, true);
            populateTicketCard(clone, booking);
            dom.bookingsContainer.appendChild(clone);
         } else {
            const fallbackCard = document.createElement("div");
            fallbackCard.className = "ticket-card";
            populateTicketCard(fallbackCard, booking);
            dom.bookingsContainer.appendChild(fallbackCard);
         }
      });
   }

   function populateTicketCard(fragment, booking) {
      const card = fragment.querySelector ? fragment.querySelector(".ticket-card") : null;
      const root = card || fragment;
      const title = root.querySelector(".ticket-title");
      const meta = root.querySelector(".ticket-meta");
      const thumb = root.querySelector(".ticket-thumb");
      const cancelBtn = root.querySelector(".cancel-ticket");

      const seats = Array.isArray(booking.seats)
         ? booking.seats
         : booking.seat
         ? [booking.seat]
         : [];

      // Extract seat codes - handle both object format {seat: "A1"} and string format "A1"
      const seatCodes = seats.map((s) => {
         if (typeof s === "string") return s;
         if (s && typeof s === "object" && s.seat) return s.seat;
         return String(s);
      });

      const price =
         typeof booking.totalPrice === "number" ? booking.totalPrice : booking.price;
      const showtime = booking.showtime || "";
      const createdAt = booking.createdAt || booking.created_at || booking.updatedAt;

      if (thumb) {
         if (booking.posterUrl) {
            thumb.style.backgroundImage = `url(${booking.posterUrl})`;
         } else {
            const colors = booking.posterColor || ["#3a7bd5", "#00d2ff"];
            thumb.style.backgroundImage = `linear-gradient(180deg, ${colors[0]}, ${colors[1]})`;
         }
      }

      if (title) title.textContent = booking.movieTitle || booking.title || "Untitled";

      if (meta) {
         const pieces = [];
         if (showtime) pieces.push(`Showtime: ${showtime}`);
         if (seatCodes.length) pieces.push(`Seats: ${seatCodes.join(", ")}`);
         if (price) pieces.push(`Total: ${formatCurrency(price)}`);
         if (createdAt) pieces.push(`Booked: ${formatDateTime(createdAt)}`);
         meta.textContent = pieces.join(" • ");
      }

      if (cancelBtn) {
         cancelBtn.addEventListener("click", () => cancelBooking(booking));
      }

      // Add Pay Now button
      try {
         const actionsContainer = root.querySelector(".ticket-actions") || root;
         const payBtn = document.createElement("button");
         payBtn.type = "button";
         payBtn.className = "btn btn-secondary pay-now";
         const paymentStatus = booking?.payment?.status || "pending";
         if (paymentStatus === "captured") {
            payBtn.textContent = "Paid";
            payBtn.disabled = true;
            payBtn.classList.add("paid");
         } else {
            payBtn.textContent = "Pay Now";
         }
         payBtn.addEventListener("click", () => openBookingPaymentModal(booking));
         actionsContainer.appendChild(payBtn);
      } catch (err) {
         // ignore UI attach errors
      }
   }

   function openBookingPaymentModal(booking) {
      if (!booking) return;
      const container = document.createElement("div");
      container.className = "booking-payment-modal";
      const seats = Array.isArray(booking.seats)
         ? booking.seats.map((s) => (typeof s === "string" ? s : s.seat)).join(", ")
         : (booking.seats || []).join(", ");
      const total =
         typeof booking.totalPrice === "number" ? booking.totalPrice : booking.price || 0;

      container.innerHTML = `
               <header class="modal-header">
                  <h2>Pay for booking</h2>
                  <p class="muted">${
                     booking.movieTitle || booking.title || "Untitled"
                  } — ${booking.showtime || ""}</p>
               </header>
               <div class="modal-body">
                  <p>Seats: ${seats || "—"}</p>
                  <p>Total: ${formatCurrency(total)}</p>
                  <section class="seat-payment" aria-labelledby="paymentHeadingBooking">
                     <div class="seat-payment-header">
                        <h3 id="paymentHeadingBooking">Payment</h3>
                        <p class="seat-payment-note">Provide sample payment details. No real payment is processed.</p>
                     </div>
                     <fieldset class="payment-methods" role="radiogroup" aria-label="Payment method">
                        <label class="payment-method-option">
                           <input type="radio" name="paymentMethod" value="card" checked />
                           <span>Credit / Debit Card</span>
                        </label>
                        <label class="payment-method-option">
                           <input type="radio" name="paymentMethod" value="bkash" />
                           <span>bKash Manual Transfer</span>
                        </label>
                     </fieldset>
                     <div class="payment-forms">
                        <div class="payment-form" data-payment-form="card">
                           <div class="payment-grid">
                              <label>
                                 Cardholder Name
                                 <input type="text" name="cardHolder" autocomplete="cc-name" placeholder="e.g. Rahim Uddin" />
                              </label>
                              <label>
                                 Card Number
                                 <input type="text" name="cardNumber" inputmode="numeric" placeholder="1111 2222 3333 4444" />
                              </label>
                              <div class="payment-row">
                                 <label>
                                    Expiry (MM/YY)
                                    <input type="text" name="cardExpiry" placeholder="08/28" />
                                 </label>
                                 <label>
                                    CVV
                                    <input type="password" name="cardCvv" maxlength="4" inputmode="numeric" placeholder="123" />
                                 </label>
                              </div>
                           </div>
                        </div>
                        <div class="payment-form hidden" data-payment-form="bkash">
                           <div class="payment-grid">
                              <div class="payment-info-box">
                                 <strong>Send Money To:</strong>
                                 <p class="bkash-merchant-number">01400874851</p>
                                 <small class="payment-help">Send the exact amount to this bKash number, then enter your details below.</small>
                              </div>
                              <label>
                                 Your bKash Account Number
                                 <input type="text" name="bkashNumber" inputmode="numeric" placeholder="01XXXXXXXXX" required />
                              </label>
                              <label>
                                 bKash Transaction ID
                                 <input type="text" name="bkashTransaction" placeholder="Enter the TrxID after sending money" required />
                              </label>
                              <div class="payment-help">
                                 <strong>Steps:</strong><br>
                                 1. Send <strong>${formatCurrency(
                                    total
                                 )}</strong> to <strong>01400874851</strong> via bKash<br>
                                 2. Enter your bKash number and transaction ID above<br>
                                 3. Click "Pay Now" for manual verification
                              </div>
                           </div>
                        </div>
                     </div>
                     <p class="payment-message" role="alert"></p>
                  </section>
               </div>
               <footer class="modal-footer">
                  <div class="modal-actions">
                     <button type="button" class="btn btn-ghost modal-cancel">Cancel</button>
                     <button type="button" class="btn btn-primary modal-pay">Pay Now</button>
                  </div>
               </footer>
            `;

      const paymentSection = container.querySelector(".seat-payment");
      const paymentMessage = paymentSection?.querySelector(".payment-message");
      const paymentMethodInputs = paymentSection
         ? Array.from(paymentSection.querySelectorAll('input[name="paymentMethod"]'))
         : [];
      const paymentForms = paymentSection
         ? Array.from(paymentSection.querySelectorAll(".payment-form"))
         : [];

      const cardForm = paymentSection?.querySelector('[data-payment-form="card"]');
      const cardHolderInput = cardForm?.querySelector('input[name="cardHolder"]');
      const cardNumberInput = cardForm?.querySelector('input[name="cardNumber"]');
      const cardExpiryInput = cardForm?.querySelector('input[name="cardExpiry"]');
      const cardCvvInput = cardForm?.querySelector('input[name="cardCvv"]');

      const bkashForm = paymentSection?.querySelector('[data-payment-form="bkash"]');
      const bkashNumberInput = bkashForm?.querySelector('input[name="bkashNumber"]');
      const bkashTransactionInput = bkashForm?.querySelector(
         'input[name="bkashTransaction"]'
      );

      const cancelBtn = container.querySelector(".modal-cancel");
      const payBtn = container.querySelector(".modal-pay");

      function setPaymentMessage(message, isError = true) {
         if (!paymentMessage) return;
         paymentMessage.textContent = message || "";
         paymentMessage.classList.toggle("error", Boolean(message && isError));
         paymentMessage.classList.toggle("success", Boolean(message && !isError));
      }

      function setPaymentMethod(method = "card") {
         paymentForms.forEach((form) => {
            const formMethod = form.dataset.paymentForm;
            form.classList.toggle("hidden", formMethod !== method);
         });
         paymentMethodInputs.forEach((input) => {
            input.checked = input.value === method;
         });
         setPaymentMessage("");
      }

      paymentMethodInputs.forEach((input) => {
         input.addEventListener("change", () => {
            if (input.checked) setPaymentMethod(input.value);
         });
      });

      cardNumberInput?.addEventListener("input", () => {
         const digitsOnly = (cardNumberInput.value || "").replace(/\D+/g, "");
         const grouped = digitsOnly.replace(/(.{4})/g, "$1 ").trim();
         cardNumberInput.value = grouped;
      });

      cardExpiryInput?.addEventListener("input", () => {
         let value = cardExpiryInput.value.replace(/[^0-9]/g, "");
         if (value.length > 4) value = value.slice(0, 4);
         if (value.length >= 3) {
            value = `${value.slice(0, 2)}/${value.slice(2)}`;
         }
         cardExpiryInput.value = value;
      });

      cancelBtn?.addEventListener("click", closeModal);

      payBtn?.addEventListener("click", async () => {
         setPaymentMessage("");
         let payload;
         try {
            const method = paymentMethodInputs.find((i) => i.checked)?.value || "card";
            if (method === "card") {
               const holder = cardHolderInput?.value?.trim() || "";
               const numberRaw = cardNumberInput?.value?.replace(/\s+/g, "") || "";
               const expiry = cardExpiryInput?.value?.trim() || "";
               const cvv = cardCvvInput?.value?.trim() || "";

               if (!holder) throw new Error("Enter the cardholder name.");
               if (!/^\d{8,19}$/.test(numberRaw))
                  throw new Error("Enter a valid card number.");
               if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(expiry))
                  throw new Error("Enter card expiry in MM/YY format.");
               if (!/^\d{3,4}$/.test(cvv)) throw new Error("Enter a valid CVV.");

               payload = {
                  method: "card",
                  cardHolder: holder,
                  cardNumber: numberRaw,
                  cardExpiry: expiry,
                  cardCvv: cvv,
               };
            } else {
               const bkashNumber = bkashNumberInput?.value?.trim() || "";
               const transactionId = bkashTransactionInput?.value?.trim() || "";
               if (!transactionId) throw new Error("Enter the bKash transaction ID.");
               payload = {
                  method: "bkash",
                  bkashNumber,
                  bkashTransactionId: transactionId,
               };
            }
         } catch (err) {
            setPaymentMessage(err.message || String(err), true);
            return;
         }

         payBtn.disabled = true;
         payBtn.textContent = "Processing...";
         try {
            const bookingId = booking.id || booking._id;
            await safeFetch(`/bookings/${encodeURIComponent(bookingId)}/payment`, {
               method: "POST",
               body: JSON.stringify(payload),
            });
            setPaymentMessage("Payment recorded successfully!", false);
            await loadUserBookings();
            renderBookings();

            // Show success toast
            showToast(
               `Payment successful! Your booking for ${booking.movieTitle} is confirmed.`,
               "success"
            );

            setTimeout(() => closeModal(), 800);
         } catch (error) {
            console.warn("Payment update failed", error);
            const errorMsg = "Unable to record payment. It will be saved locally.";
            setPaymentMessage(errorMsg, true);

            // Show warning toast
            showToast(errorMsg, "warning");

            // Fallback: update local booking copy
            try {
               const existing = loadLocalBookings();
               const idx = existing.findIndex(
                  (b) => (b.id || b._id) === (booking.id || booking._id)
               );
               const localCopy = existing[idx] || booking;

               // Set payment status as captured for both card and bKash
               const paymentInfo = {
                  ...payload,
                  status: "captured",
               };
               localCopy.payment = paymentInfo;

               if (idx >= 0) existing[idx] = localCopy;
               else existing.push(localCopy);
               localStorage.setItem(LOCAL_BOOKINGS_KEY, JSON.stringify(existing));
               state.userBookings = loadLocalBookings();
               renderBookings();
               setTimeout(() => closeModal(), 800);
            } catch (err2) {
               console.warn("Local save failed", err2);
            }
         } finally {
            payBtn.disabled = false;
            payBtn.textContent = "Pay Now";
         }
      });

      openModal(container);
      setPaymentMethod("card");
   }

   async function cancelBooking(booking) {
      const bookingId = booking.id || booking._id;
      if (!bookingId) return;
      if (!window.confirm("Cancel this booking?")) return;

      if (state.user) {
         try {
            await safeFetch(`/bookings/${bookingId}`, { method: "DELETE" });
            localSeatCache.delete(`${booking.movieId}::${booking.showtime}`);
            await loadUserBookings();

            // Show success toast
            showToast("Booking cancelled successfully!", "success");
            return;
         } catch (error) {
            console.error("Remote cancellation failed, attempting local removal.", error);
            showToast("Remote cancellation failed, cancelling locally...", "warning");
         }
      }

      removeLocalBooking(bookingId);
      localSeatCache.delete(`${booking.movieId}::${booking.showtime}`);
      state.userBookings = loadLocalBookings();
      renderBookings();

      // Show success toast for local cancellation
      showToast("Booking cancelled locally!", "success");
   }

   function removeLocalBooking(bookingId) {
      try {
         const filtered = loadLocalBookings().filter((item) => item.id !== bookingId);
         localStorage.setItem(LOCAL_BOOKINGS_KEY, JSON.stringify(filtered));
      } catch (error) {
         console.warn("Unable to remove local booking", error);
      }
   }

   async function loadAdminResources() {
      if (!state.isAdmin) return;
      try {
         const [movies, upcoming, carousel, media, bookings, users, config] = await Promise.all([
            safeFetch("/admin/movies").catch(() => state.movies),
            safeFetch("/admin/upcoming").catch(() => state.upcoming),
            safeFetch("/admin/carousel").catch(() => state.carousel),
            safeFetch("/admin/media").catch(() => []),
            safeFetch("/admin/bookings").catch(() => []),
            safeFetch("/admin/users").catch(() => []),
            safeFetch("/admin/config").catch(() => state.config),
         ]);

         state.admin.movies = Array.isArray(movies) ? movies : [];
         state.admin.upcoming = Array.isArray(upcoming) ? upcoming : [];
         state.admin.carousel = Array.isArray(carousel) ? carousel : [];
         state.admin.media = Array.isArray(media) ? media : [];
         state.admin.bookings = Array.isArray(bookings) ? bookings : [];
         state.admin.users = Array.isArray(users) ? users : [];
         if (config) {
            state.config = config;
            applyConfig(state.config);
         }

         renderAdminTables();
         populateConfigForm();
      } catch (error) {
         console.error("Failed to load admin resources", error);
      }
   }

   function renderAdminTables() {
      renderAdminMoviesTable();
      renderAdminCarouselTable();
      renderAdminUpcomingTable();
      renderAdminMediaTable();
      renderAdminBookingsTable();
      renderAdminUsersTable();
   }

   function renderAdminMoviesTable() {
      if (!dom.adminMoviesTable) return;
      dom.adminMoviesTable.innerHTML = "";
      const movies = state.admin.movies.length ? state.admin.movies : state.movies;
      if (!movies.length) {
         dom.adminMoviesTable.innerHTML = `<tr><td colspan="6">No movies found.</td></tr>`;
         return;
      }
      movies.forEach((movie) => {
         const row = document.createElement("tr");
         const isFeatured = Boolean(movie.isFeatured);
         const priorityLabel =
            typeof movie.featurePriority === "number" &&
            Number.isFinite(movie.featurePriority) &&
            movie.featurePriority !== 0
               ? ` (#${movie.featurePriority})`
               : "";
         row.innerHTML = `
               <td>${movie.title || "Untitled"}</td>
               <td>${
                  Array.isArray(movie.showtimes) ? movie.showtimes.join(", ") : "—"
               }</td>
               <td>${movie.status || "published"}</td>
               <td>${isFeatured ? `Yes${priorityLabel}` : "No"}</td>
               <td>${formatDateTime(movie.updatedAt) || "—"}</td>
               <td>
                  <button type="button" class="btn btn-ghost btn-sm admin-edit-movie" data-id="${
                     movie.id || movie._id
                  }">Edit</button>
                  <button type="button" class="btn btn-ghost btn-sm btn-danger admin-delete-movie" data-id="${
                     movie.id || movie._id
                  }">Delete</button>
               </td>
            `;
         dom.adminMoviesTable.appendChild(row);
      });
   }

   function handleMoviesTableActions(event) {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      const movieId = target.dataset.id;
      if (!movieId) return;
      if (target.classList.contains("admin-edit-movie")) {
         populateMovieForm(movieId);
      } else if (target.classList.contains("admin-delete-movie")) {
         deleteMovie(movieId);
      }
   }

   function renderAdminCarouselTable() {
      if (!dom.adminCarouselTable) return;
      dom.adminCarouselTable.innerHTML = "";
      const slides = state.admin.carousel.length ? state.admin.carousel : state.carousel;

      if (!slides.length) {
         dom.adminCarouselTable.innerHTML = `<tr><td colspan="5">No carousel slides yet.</td></tr>`;
         return;
      }

      slides.forEach((slide) => {
         const row = document.createElement("tr");
         const slideId = slide.id || slide._id;
         const priority =
            typeof slide.priority === "number" && Number.isFinite(slide.priority)
               ? slide.priority
               : "—";
         row.innerHTML = `
               <td>${slide.title || "Untitled"}</td>
               <td>${slide.status || "draft"}</td>
               <td>${priority}</td>
               <td>${formatDateTime(slide.updatedAt) || "—"}</td>
               <td>
                  <button type="button" class="btn btn-ghost btn-sm admin-edit-carousel" data-id="${
                     slideId || ""
                  }">Edit</button>
                  <button type="button" class="btn btn-ghost btn-sm btn-danger admin-delete-carousel" data-id="${
                     slideId || ""
                  }">Delete</button>
               </td>
            `;
         dom.adminCarouselTable.appendChild(row);
      });
   }

   function handleCarouselTableActions(event) {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      const slideId = target.dataset.id;
      if (!slideId) return;
      if (target.classList.contains("admin-edit-carousel")) {
         populateCarouselForm(slideId);
      } else if (target.classList.contains("admin-delete-carousel")) {
         deleteCarouselSlide(slideId);
      }
   }

   function populateCarouselForm(slideId) {
      if (!dom.adminCarouselForm) return;
      const slide =
         state.admin.carousel.find((item) => (item.id || item._id) === slideId) ||
         state.carousel.find((item) => (item.id || item._id) === slideId);
      if (!slide) return;

      state.editing.carouselId = slideId;
      const controls = dom.adminCarouselForm.elements;
      controls.namedItem("carouselId").value = slideId;

      const posterUrlControl = controls.namedItem("posterUrl");
      if (posterUrlControl) posterUrlControl.value = slide.posterUrl || "";
      const posterPublicIdControl = controls.namedItem("posterPublicId");
      if (posterPublicIdControl) posterPublicIdControl.value = slide.posterPublicId || "";
      const posterFileInput = controls.namedItem("posterFile");
      if (posterFileInput && posterFileInput.value) {
         posterFileInput.value = "";
      }

      setFormMessage(dom.adminCarouselFormMessage, "Editing existing slide.", false);
      dom.adminCarouselForm.scrollIntoView({ behavior: "smooth", block: "center" });
   }

   async function handleCarouselFormSubmit(event) {
      event.preventDefault();
      if (!dom.adminCarouselForm) return;
      const formData = new FormData(dom.adminCarouselForm);
      const slideId = formData.get("carouselId");
      const payload = new FormData();

      // Only send required fields for carousel (title and status are hidden defaults)
      payload.append("title", formData.get("title") || "Carousel Slide");
      payload.append("status", formData.get("status") || "published");

      const existingPosterUrl = formData.get("posterUrl");
      if (typeof existingPosterUrl === "string") {
         payload.append("posterUrl", existingPosterUrl);
      }

      const posterPublicId = formData.get("posterPublicId");
      if (typeof posterPublicId === "string") {
         payload.append("posterPublicId", posterPublicId);
      }

      const posterFile = formData.get("posterFile");
      if (posterFile instanceof File && posterFile.size > 0) {
         payload.append("posterFile", posterFile);
      }

      setFormMessage(dom.adminCarouselFormMessage, "Saving slide...", false);

      try {
         if (slideId) {
            await safeFetch(`/admin/carousel/${slideId}`, {
               method: "PUT",
               body: payload,
            });
         } else {
            await safeFetch("/admin/carousel", {
               method: "POST",
               body: payload,
            });
         }

         dom.adminCarouselForm.reset();
         state.editing.carouselId = null;
         setFormMessage(dom.adminCarouselFormMessage, "Slide saved successfully.", false);
         await loadPublicContent();
         await loadAdminResources();

         // Show success toast
         showToast(
            slideId
               ? "Carousel slide updated successfully!"
               : "Carousel slide created successfully!",
            "success"
         );
      } catch (error) {
         console.error(error);
         const errorMsg = error.message || "Unable to save slide.";
         setFormMessage(dom.adminCarouselFormMessage, errorMsg, true);

         // Show error toast
         showToast(errorMsg, "error");
      }
   }

   function resetCarouselForm() {
      dom.adminCarouselForm?.reset();
      state.editing.carouselId = null;
      setFormMessage(dom.adminCarouselFormMessage, "");
   }

   async function deleteCarouselSlide(slideId) {
      if (!window.confirm("Delete this carousel slide?")) return;
      try {
         await safeFetch(`/admin/carousel/${slideId}`, { method: "DELETE" });
         await loadPublicContent();
         await loadAdminResources();

         // Show success toast
         showToast("Carousel slide deleted successfully!", "success");
      } catch (error) {
         console.error(error);
         const errorMsg = error.message || "Delete failed.";
         setFormMessage(dom.adminCarouselFormMessage, errorMsg, true);

         // Show error toast
         showToast(errorMsg, "error");
      }
   }

   function populateMovieForm(movieId) {
      if (!dom.adminMovieForm) return;
      const movie =
         state.admin.movies.find((item) => (item.id || item._id) === movieId) ||
         state.movies.find((item) => (item.id || item._id) === movieId);
      if (!movie) return;

      state.editing.movieId = movieId;
      const controls = dom.adminMovieForm.elements;
      controls.namedItem("movieId").value = movieId;
      controls.namedItem("title").value = movie.title || "";
      controls.namedItem("runtime").value = movie.runtime || "";
      controls.namedItem("rating").value = movie.rating || "";
      controls.namedItem("price").value =
         typeof movie.price === "number" ? String(movie.price) : "";
      controls.namedItem("releaseYear").value = movie.releaseYear || "";
      controls.namedItem("imdbRating").value = movie.imdbRating || "";
      controls.namedItem("showtimes").value = Array.isArray(movie.showtimes)
         ? movie.showtimes.join(", ")
         : "";
      controls.namedItem("genres").value = asList(movie.genres || movie.genre);
      controls.namedItem("cast").value = asList(movie.cast);
      controls.namedItem("synopsis").value = movie.synopsis || "";
      controls.namedItem("director").value = movie.director || "";
      controls.namedItem("producer").value = movie.producer || "";
      controls.namedItem("posterUrl").value = movie.posterUrl || "";
      controls.namedItem("posterPublicId").value = movie.posterPublicId || "";
      const posterFileInput = controls.namedItem("posterFile");
      if (posterFileInput && posterFileInput.value) {
         posterFileInput.value = "";
      }
      controls.namedItem("multiplierFront").value =
         movie.multiplierFront || state.seatMultipliers.front;
      controls.namedItem("multiplierMiddle").value =
         movie.multiplierMiddle || state.seatMultipliers.middle;
      controls.namedItem("multiplierBack").value =
         movie.multiplierBack || state.seatMultipliers.back;
      const featuredControl = controls.namedItem("isFeatured");
      if (featuredControl && "checked" in featuredControl) {
         featuredControl.checked = Boolean(movie.isFeatured);
      }
      const priorityControl = controls.namedItem("featurePriority");
      if (priorityControl) {
         const priorityValue =
            typeof movie.featurePriority === "number" &&
            Number.isFinite(movie.featurePriority)
               ? String(movie.featurePriority)
               : "";
         priorityControl.value = priorityValue;
      }

      setFormMessage(dom.adminMovieFormMessage, "Editing existing movie.", false);
      dom.adminMovieForm.scrollIntoView({ behavior: "smooth", block: "center" });
   }

   async function handleMovieFormSubmit(event) {
      event.preventDefault();
      if (!dom.adminMovieForm) return;
      const formData = new FormData(dom.adminMovieForm);
      const movieId = formData.get("movieId");
      const payload = new FormData();
      payload.append("title", formData.get("title") || "");
      payload.append("runtime", formData.get("runtime") || "");
      payload.append("rating", formData.get("rating") || "");
      payload.append("price", formData.get("price") || "");
      payload.append("releaseYear", formData.get("releaseYear") || "");
      payload.append("imdbRating", formData.get("imdbRating") || "");
      payload.append("synopsis", formData.get("synopsis") || "");
      payload.append("director", formData.get("director") || "");
      payload.append("producer", formData.get("producer") || "");
      payload.append(
         "showtimes",
         JSON.stringify(splitAndTrim(formData.get("showtimes")))
      );
      payload.append("genres", JSON.stringify(splitAndTrim(formData.get("genres"))));
      payload.append("cast", JSON.stringify(splitAndTrim(formData.get("cast"))));
      payload.append(
         "multiplierFront",
         formData.get("multiplierFront") || String(state.seatMultipliers.front)
      );
      payload.append(
         "multiplierMiddle",
         formData.get("multiplierMiddle") || String(state.seatMultipliers.middle)
      );
      payload.append(
         "multiplierBack",
         formData.get("multiplierBack") || String(state.seatMultipliers.back)
      );

      const isFeaturedRaw = formData.get("isFeatured");
      const isFeaturedValue =
         isFeaturedRaw === "true" || isFeaturedRaw === "on" || isFeaturedRaw === "1";
      payload.append("isFeatured", isFeaturedValue ? "true" : "false");

      const featurePriorityRaw = formData.get("featurePriority");
      if (featurePriorityRaw !== undefined && featurePriorityRaw !== null) {
         payload.append("featurePriority", featurePriorityRaw);
      }

      const existingPosterUrl = formData.get("posterUrl");
      if (typeof existingPosterUrl === "string" && existingPosterUrl) {
         payload.append("posterUrl", existingPosterUrl);
      }
      const posterPublicId = formData.get("posterPublicId");
      if (typeof posterPublicId === "string" && posterPublicId) {
         payload.append("posterPublicId", posterPublicId);
      }
      const posterFile = formData.get("posterFile");
      if (posterFile instanceof File && posterFile.size > 0) {
         payload.append("posterFile", posterFile);
      }

      setFormMessage(dom.adminMovieFormMessage, "Saving movie...", false);
      try {
         if (movieId) {
            await safeFetch(`/admin/movies/${movieId}`, {
               method: "PUT",
               body: payload,
            });
         } else {
            await safeFetch("/admin/movies", {
               method: "POST",
               body: payload,
            });
         }
         dom.adminMovieForm.reset();
         state.editing.movieId = null;
         setFormMessage(dom.adminMovieFormMessage, "Movie saved successfully.", false);
         await loadPublicContent();
         await loadAdminResources();

         // Show success toast
         showToast(
            movieId ? "Movie updated successfully!" : "Movie created successfully!",
            "success"
         );
      } catch (error) {
         console.error(error);
         const errorMsg = error.message || "Unable to save movie.";
         setFormMessage(dom.adminMovieFormMessage, errorMsg, true);

         // Show error toast
         showToast(errorMsg, "error");
      }
   }

   function resetMovieForm() {
      dom.adminMovieForm?.reset();
      state.editing.movieId = null;
      setFormMessage(dom.adminMovieFormMessage, "");
   }

   async function deleteMovie(movieId) {
      if (!window.confirm("Delete this movie?")) return;
      try {
         await safeFetch(`/admin/movies/${movieId}`, { method: "DELETE" });
         await loadPublicContent();
         await loadAdminResources();

         // Show success toast
         showToast("Movie deleted successfully!", "success");
      } catch (error) {
         console.error(error);
         const errorMsg = error.message || "Delete failed.";
         setFormMessage(dom.adminMovieFormMessage, errorMsg, true);

         // Show error toast
         showToast(errorMsg, "error");
      }
   }

   function renderAdminUpcomingTable() {
      if (!dom.adminUpcomingTable) return;
      dom.adminUpcomingTable.innerHTML = "";
      const items = state.admin.upcoming.length ? state.admin.upcoming : state.upcoming;
      if (!items.length) {
         dom.adminUpcomingTable.innerHTML = `<tr><td colspan="5">No upcoming releases yet.</td></tr>`;
         return;
      }
      items.forEach((item) => {
         const row = document.createElement("tr");
         row.innerHTML = `
               <td>${item.title || "Untitled"}</td>
               <td>${formatDate(item.releaseDate) || "TBA"}</td>
               <td>${item.status || "draft"}</td>
               <td>${formatDateTime(item.updatedAt) || "—"}</td>
               <td>
                  <button type="button" class="btn btn-ghost btn-sm admin-edit-upcoming" data-id="${
                     item.id || item._id
                  }">Edit</button>
                  <button type="button" class="btn btn-ghost btn-sm btn-danger admin-delete-upcoming" data-id="${
                     item.id || item._id
                  }">Delete</button>
               </td>
            `;
         dom.adminUpcomingTable.appendChild(row);
      });
   }

   function handleUpcomingTableActions(event) {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      const id = target.dataset.id;
      if (!id) return;
      if (target.classList.contains("admin-edit-upcoming")) {
         populateUpcomingForm(id);
      } else if (target.classList.contains("admin-delete-upcoming")) {
         deleteUpcoming(id);
      }
   }

   function populateUpcomingForm(id) {
      if (!dom.adminUpcomingForm) return;
      const entry =
         state.admin.upcoming.find((item) => (item.id || item._id) === id) ||
         state.upcoming.find((item) => (item.id || item._id) === id);
      if (!entry) return;
      state.editing.upcomingId = id;
      const controls = dom.adminUpcomingForm.elements;
      controls.namedItem("upcomingId").value = id;
      controls.namedItem("title").value = entry.title || "";
      controls.namedItem("releaseDate").value = entry.releaseDate
         ? entry.releaseDate.slice(0, 10)
         : "";
      controls.namedItem("status").value = entry.status || "draft";
      controls.namedItem("summary").value = entry.summary || "";
      controls.namedItem("posterUrl").value = entry.posterUrl || "";
      controls.namedItem("posterPublicId").value = entry.posterPublicId || "";
      const posterFileInput = controls.namedItem("posterFile");
      if (posterFileInput && posterFileInput.value) {
         posterFileInput.value = "";
      }
      setFormMessage(dom.adminUpcomingFormMessage, "Editing upcoming release.", false);
      dom.adminUpcomingForm.scrollIntoView({ behavior: "smooth", block: "center" });
   }

   async function handleUpcomingFormSubmit(event) {
      event.preventDefault();
      if (!dom.adminUpcomingForm) return;
      const formData = new FormData(dom.adminUpcomingForm);
      const upcomingId = formData.get("upcomingId");
      const payload = new FormData();
      payload.append("title", formData.get("title") || "");
      payload.append("releaseDate", formData.get("releaseDate") || "");
      payload.append("status", formData.get("status") || "draft");
      payload.append("summary", formData.get("summary") || "");

      const existingPosterUrl = formData.get("posterUrl");
      if (typeof existingPosterUrl === "string" && existingPosterUrl) {
         payload.append("posterUrl", existingPosterUrl);
      }
      const posterPublicId = formData.get("posterPublicId");
      if (typeof posterPublicId === "string" && posterPublicId) {
         payload.append("posterPublicId", posterPublicId);
      }
      const posterFile = formData.get("posterFile");
      if (posterFile instanceof File && posterFile.size > 0) {
         payload.append("posterFile", posterFile);
      }
      setFormMessage(dom.adminUpcomingFormMessage, "Saving upcoming release...", false);
      try {
         if (upcomingId) {
            await safeFetch(`/admin/upcoming/${upcomingId}`, {
               method: "PUT",
               body: payload,
            });
         } else {
            await safeFetch("/admin/upcoming", {
               method: "POST",
               body: payload,
            });
         }
         dom.adminUpcomingForm.reset();
         state.editing.upcomingId = null;
         setFormMessage(dom.adminUpcomingFormMessage, "Upcoming release saved.", false);
         await loadPublicContent();
         await loadAdminResources();

         // Show success toast
         showToast(
            upcomingId
               ? "Upcoming release updated successfully!"
               : "Upcoming release created successfully!",
            "success"
         );
      } catch (error) {
         console.error(error);
         const errorMsg = error.message || "Unable to save upcoming release.";
         setFormMessage(dom.adminUpcomingFormMessage, errorMsg, true);

         // Show error toast
         showToast(errorMsg, "error");
      }
   }

   function resetUpcomingForm() {
      dom.adminUpcomingForm?.reset();
      state.editing.upcomingId = null;
      setFormMessage(dom.adminUpcomingFormMessage, "");
   }

   async function deleteUpcoming(id) {
      if (!window.confirm("Delete this upcoming release?")) return;
      try {
         await safeFetch(`/admin/upcoming/${id}`, { method: "DELETE" });
         await loadPublicContent();
         await loadAdminResources();

         // Show success toast
         showToast("Upcoming release deleted successfully!", "success");
      } catch (error) {
         console.error(error);
         const errorMsg = error.message || "Delete failed.";
         setFormMessage(dom.adminUpcomingFormMessage, errorMsg, true);

         // Show error toast
         showToast(errorMsg, "error");
      }
   }

   function renderAdminMediaTable() {
      if (!dom.adminMediaTable) return;
      dom.adminMediaTable.innerHTML = "";
      const mediaList = state.admin.media || [];
      if (!mediaList.length) {
         dom.adminMediaTable.innerHTML = `<tr><td colspan="6">No media uploaded yet.</td></tr>`;
         return;
      }
      mediaList.forEach((asset) => {
         const row = document.createElement("tr");
         const preview =
            asset.type === "backgroundVideo"
               ? `<video src="${
                    asset.secureUrl || asset.url
                 }" muted loop playsinline></video>`
               : `<img src="${asset.secureUrl || asset.url}" alt="${asset.type}" />`;
         row.innerHTML = `
               <td class="media-preview">${preview}</td>
               <td>${asset.type || "—"}</td>
               <td>${asset.movieId || "—"}</td>
               <td>${asset.visibility || "public"}</td>
               <td>${formatDateTime(asset.updatedAt) || "—"}</td>
               <td>
                  <button type="button" class="btn btn-ghost btn-sm admin-use-media" data-id="${
                     asset.id || asset._id
                  }">Use</button>
                  <button type="button" class="btn btn-ghost btn-sm btn-danger admin-delete-media" data-id="${
                     asset.id || asset._id
                  }">Delete</button>
               </td>
            `;
         dom.adminMediaTable.appendChild(row);
      });
   }

   function handleMediaTableActions(event) {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      const id = target.dataset.id;
      if (!id) return;
      if (target.classList.contains("admin-use-media")) {
         assignMedia(id);
      } else if (target.classList.contains("admin-delete-media")) {
         deleteMedia(id);
      }
   }

   async function handleMediaUpload(event) {
      event.preventDefault();
      if (!dom.adminMediaForm) return;
      const formData = new FormData(dom.adminMediaForm);
      setFormMessage(dom.adminMediaMessage, "Uploading media...", false);
      try {
         await safeFetch("/admin/media", {
            method: "POST",
            body: formData,
         });
         dom.adminMediaForm.reset();
         setFormMessage(dom.adminMediaMessage, "Upload complete.", false);
         await loadAdminResources();

         // Show success toast
         showToast("Media uploaded successfully!", "success");
      } catch (error) {
         console.error(error);
         const errorMsg = error.message || "Upload failed.";
         setFormMessage(dom.adminMediaMessage, errorMsg, true);

         // Show error toast
         showToast(errorMsg, "error");
      }
   }

   function resetMediaForm() {
      dom.adminMediaForm?.reset();
      setFormMessage(dom.adminMediaMessage, "");
   }

   async function assignMedia(id) {
      try {
         const result = await safeFetch(`/admin/media/${id}/assign`, { method: "POST" });
         if (result?.config) {
            state.config = result.config;
            applyConfig(state.config);
            populateConfigForm();
         }

         // Show success toast
         showToast("Media assigned successfully!", "success");
      } catch (error) {
         console.error("Unable to assign media", error);
         const errorMsg = error.message || "Assignment failed.";
         setFormMessage(dom.adminMediaMessage, errorMsg, true);

         // Show error toast
         showToast(errorMsg, "error");
      }
   }

   async function deleteMedia(id) {
      if (!window.confirm("Delete this media asset?")) return;
      try {
         await safeFetch(`/admin/media/${id}`, { method: "DELETE" });
         await loadAdminResources();

         // Show success toast
         showToast("Media deleted successfully!", "success");
      } catch (error) {
         console.error(error);
         const errorMsg = error.message || "Delete failed.";
         setFormMessage(dom.adminMediaMessage, errorMsg, true);

         // Show error toast
         showToast(errorMsg, "error");
      }
   }

   function renderAdminBookingsTable() {
      if (!dom.adminBookingsTable) return;
      dom.adminBookingsTable.innerHTML = "";
      const bookings = state.admin.bookings || [];
      if (!bookings.length) {
         dom.adminBookingsTable.innerHTML = `<tr><td colspan="9">No bookings found.</td></tr>`;
         return;
      }
      bookings.forEach((booking) => {
         const row = document.createElement("tr");
         const userEmail = booking.user?.email || "Unknown User";
         const movieTitle = booking.movie?.title || booking.movieTitle || "—";
         const seats = booking.seatCodes?.join(", ") || booking.seats?.map(s => s.seat).join(", ") || "—";
         const totalPrice = formatCurrency(booking.totalPrice || 0);
         const paymentMethod = booking.payment?.method || "—";
         const paymentStatus = booking.payment?.status || "pending";
         const bookingStatus = booking.status || "confirmed";
         const bookedDate = formatDateTime(booking.createdAt);
         
         row.innerHTML = `
            <td>${userEmail}</td>
            <td>${movieTitle}</td>
            <td>${booking.showtime || "—"}</td>
            <td>${seats}</td>
            <td>${totalPrice}</td>
            <td>${paymentMethod} (${paymentStatus})</td>
            <td><span class="badge ${bookingStatus === 'confirmed' ? 'badge-success' : 'badge-warning'}">${bookingStatus}</span></td>
            <td>${bookedDate}</td>
            <td>
               <button type="button" class="btn btn-ghost btn-sm btn-danger admin-delete-booking" data-id="${booking._id || booking.id}">Delete</button>
            </td>
         `;
         dom.adminBookingsTable.appendChild(row);
      });
   }

   function handleBookingsTableActions(event) {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      if (target.classList.contains("admin-delete-booking")) {
         const bookingId = target.dataset.id;
         if (!bookingId) return;
         deleteAdminBooking(bookingId);
      }
   }

   async function deleteAdminBooking(bookingId) {
      if (!confirm("Are you sure you want to delete this booking?")) return;
      try {
         await safeFetch(`/admin/bookings/${bookingId}`, {
            method: "DELETE",
         });
         showToast("Booking deleted successfully", "success");
         await loadAdminResources();
      } catch (error) {
         console.error("Failed to delete booking", error);
         showToast("Failed to delete booking", "error");
      }
   }

   function renderAdminUsersTable() {
      if (!dom.adminUsersTable) return;
      dom.adminUsersTable.innerHTML = "";
      const users = state.admin.users || [];
      if (!users.length) {
         dom.adminUsersTable.innerHTML = `<tr><td colspan="5">No users found.</td></tr>`;
         return;
      }
      users.forEach((user) => {
         const row = document.createElement("tr");
         const isAdmin = user.role === "admin" || user.isAdmin;
         row.innerHTML = `
               <td>${user.email || "—"}</td>
               <td>${user.displayName || "—"}</td>
               <td>${isAdmin ? "admin" : "user"}</td>
               <td>${formatDateTime(user.lastSignInTime || user.lastSignInAt) || "—"}</td>
               <td>
                  <button type="button" class="btn btn-ghost btn-sm admin-promote-user" data-id="${
                     user.uid || user.id
                  }" data-admin="${isAdmin ? "1" : "0"}">${
            isAdmin ? "Revoke" : "Promote"
         }</button>
               </td>
            `;
         dom.adminUsersTable.appendChild(row);
      });
   }

   function handleUsersTableActions(event) {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      if (!target.classList.contains("admin-promote-user")) return;
      const userId = target.dataset.id;
      if (!userId) return;
      const isAdmin = target.dataset.admin === "1";
      toggleUserRole(userId, isAdmin);
   }

   async function toggleUserRole(userId, revoke) {
      try {
         await safeFetch(`/admin/users/${userId}/${revoke ? "revoke" : "promote"}`, {
            method: "POST",
         });
         await loadAdminResources();
      } catch (error) {
         console.error(error);
      }
   }

   function populateConfigForm() {
      if (!dom.adminConfigForm || !state.config) return;
      const controls = dom.adminConfigForm.elements;
      controls.namedItem("brandTitle").value = state.config.brandTitle || "";
      controls.namedItem("tagline").value = state.config.tagline || "";
      controls.namedItem("supportEmail").value = state.config.supportEmail || "";
      controls.namedItem("seatFront").value =
         state.config.seatMultipliers?.front ?? state.seatMultipliers.front;
      controls.namedItem("seatMiddle").value =
         state.config.seatMultipliers?.middle ?? state.seatMultipliers.middle;
      controls.namedItem("seatBack").value =
         state.config.seatMultipliers?.back ?? state.seatMultipliers.back;
      if (controls.namedItem("backgroundVideoId") && state.config.backgroundVideoId) {
         controls.namedItem("backgroundVideoId").value = state.config.backgroundVideoId;
      }
   }

   async function handleConfigSubmit(event) {
      event.preventDefault();
      if (!dom.adminConfigForm) return;
      const formData = new FormData(dom.adminConfigForm);
      const payload = {
         brandTitle: formData.get("brandTitle"),
         tagline: formData.get("tagline"),
         supportEmail: formData.get("supportEmail"),
         seatMultipliers: {
            front: toNumber(formData.get("seatFront")) || state.seatMultipliers.front,
            middle: toNumber(formData.get("seatMiddle")) || state.seatMultipliers.middle,
            back: toNumber(formData.get("seatBack")) || state.seatMultipliers.back,
         },
         backgroundVideoId: formData.get("backgroundVideoId"),
      };
      setFormMessage(dom.adminConfigMessage, "Saving configuration...", false);
      try {
         const result = await safeFetch("/admin/config", {
            method: "PUT",
            body: JSON.stringify(payload),
         });
         if (result) {
            state.config = result;
         } else {
            state.config = { ...state.config, ...payload };
         }
         applyConfig(state.config);
         populateConfigForm();
         setFormMessage(dom.adminConfigMessage, "Configuration updated.", false);

         // Show success toast
         showToast("Configuration updated successfully!", "success");
      } catch (error) {
         console.error(error);
         const errorMsg = error.message || "Unable to save configuration.";
         setFormMessage(dom.adminConfigMessage, errorMsg, true);

         // Show error toast
         showToast(errorMsg, "error");
      }
   }

   function resetConfigForm() {
      populateConfigForm();
      setFormMessage(dom.adminConfigMessage, "");
   }

   function setFormMessage(element, message, isError = false) {
      if (!element) return;
      element.textContent = message || "";
      element.classList.toggle("error", Boolean(message && isError));
      element.classList.toggle("success", Boolean(message && !isError));
   }

   /**
    * Show a toast notification
    * @param {string} message - The message to display
    * @param {string} type - Type of toast: 'success', 'error', 'info', 'warning'
    * @param {number} duration - Duration in milliseconds (default: 4000)
    */
   function showToast(message, type = "info", duration = 4000) {
      const container = document.getElementById("toastContainer");
      const backdrop = document.getElementById("toastBackdrop");
      if (!container) return;

      // Show backdrop
      if (backdrop) {
         backdrop.classList.add("active");
      }

      // Create toast element
      const toast = document.createElement("div");
      toast.className = `toast toast-${type}`;

      // Determine icon based on type
      const icons = {
         success: "✓",
         error: "✕",
         info: "ℹ",
         warning: "⚠",
      };

      // Determine title based on type
      const titles = {
         success: "Success",
         error: "Error",
         info: "Information",
         warning: "Warning",
      };

      toast.innerHTML = `
         <div class="toast-icon">${icons[type] || "ℹ"}</div>
         <div class="toast-content">
            <p class="toast-title">${titles[type] || "Notification"}</p>
            <p class="toast-message">${message}</p>
         </div>
         <button class="toast-close" aria-label="Close notification">×</button>
         <div class="toast-progress" style="animation-duration: ${duration}ms;"></div>
      `;

      // Add to container
      container.appendChild(toast);

      // Close button handler
      const closeBtn = toast.querySelector(".toast-close");
      closeBtn.addEventListener("click", () => removeToast(toast));

      // Auto remove after duration
      const timeoutId = setTimeout(() => {
         removeToast(toast);
      }, duration);

      // Store timeout ID for potential early removal
      toast.dataset.timeoutId = timeoutId;
   }

   function removeToast(toast) {
      if (!toast) return;

      // Clear timeout if exists
      if (toast.dataset.timeoutId) {
         clearTimeout(parseInt(toast.dataset.timeoutId));
      }

      // Add removing animation
      toast.classList.add("toast-removing");

      // Remove after animation completes
      setTimeout(() => {
         toast.remove();

         // Hide backdrop if no more toasts
         const container = document.getElementById("toastContainer");
         const backdrop = document.getElementById("toastBackdrop");
         if (container && backdrop && container.children.length === 0) {
            backdrop.classList.remove("active");
         }
      }, 300);
   }

   async function safeFetch(endpoint, options = {}) {
      const url = endpoint.startsWith("http") ? endpoint : `${API_BASE_URL}${endpoint}`;
      const opts = { ...options };
      opts.headers = new Headers(opts.headers || {});
      if (state.sessionToken && state.sessionExpiresAt) {
         if (isSessionExpired(state.sessionExpiresAt)) {
            resetAuthState({
               reason: "expired",
               message: "Your session expired. Please sign in again.",
               isError: true,
            });
            throw new Error("Session expired. Please sign in again.");
         }
         opts.headers.set("x-session-token", state.sessionToken);
      }
      if (opts.body && !(opts.body instanceof FormData)) {
         if (!opts.headers.has("Content-Type")) {
            opts.headers.set("Content-Type", "application/json");
         }
         if (typeof opts.body !== "string") {
            opts.body = JSON.stringify(opts.body);
         }
      }
      const response = await fetch(url, opts);
      if (!response.ok) {
         if (response.status === 401 && state.sessionToken) {
            resetAuthState({
               reason: "invalid",
               message: "Your session is no longer valid. Please sign in again.",
               isError: true,
            });
         }
         if (response.status === 403 && state.isAdmin) {
            state.isAdmin = false;
            if (state.user) {
               state.user.role = "user";
            }
            updateAuthUI();
         }
         const message = await extractErrorMessage(response);
         throw new Error(message || `Request failed with status ${response.status}`);
      }
      if (response.status === 204) return null;
      const contentType = response.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
         return response.json();
      }
      return response.text();
   }

   async function extractErrorMessage(response) {
      try {
         const contentType = response.headers.get("content-type") || "";
         if (contentType.includes("application/json")) {
            const body = await response.json();
            return body.message || body.error || JSON.stringify(body);
         }
         return await response.text();
      } catch {
         return "";
      }
   }

   function splitAndTrim(value) {
      if (!value) return [];
      return value
         .split(",")
         .map((part) => part.trim())
         .filter(Boolean);
   }

   function asList(value) {
      if (Array.isArray(value)) return value.join(", ");
      return value || "";
   }

   function formatDate(value) {
      if (!value) return "";
      try {
         return new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(
            new Date(value)
         );
      } catch {
         return value;
      }
   }

   function formatDateTime(value) {
      if (!value) return "";
      try {
         return new Intl.DateTimeFormat("en", {
            dateStyle: "medium",
            timeStyle: "short",
         }).format(new Date(value));
      } catch {
         return value;
      }
   }

   function formatCurrency(value) {
      if (typeof value !== "number" || Number.isNaN(value)) return "";
      try {
         return new Intl.NumberFormat("en-BD", {
            style: "currency",
            currency: "BDT",
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
         }).format(value);
      } catch {
         return `৳${value.toFixed(0)}`;
      }
   }

   function toNumber(value) {
      const parsed = parseFloat(value);
      return Number.isFinite(parsed) ? parsed : undefined;
   }

   window.MovieShowApp = {
      state,
      reload: loadPublicContent,
   };
})();
