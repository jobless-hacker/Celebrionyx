(() => {
  const SESSION_KEY = "intelDash.session";
  const REMEMBERED_EMAIL_KEY = "intelDash.rememberedEmail";
  const DEMO_ACCOUNTS = {
    "analyst@intelligence.local": {
      name: "SOC Analyst",
      password: "ThreatWatch@2026",
      role: "Security Operations"
    },
    "admin@intelligence.local": {
      name: "System Administrator",
      password: "SecureOps@2026",
      role: "Platform Administration"
    }
  };

  const $ = (id) => document.getElementById(id);

  const safeParse = (value) => {
    if (!value) {
      return null;
    }
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  };

  const getSession = () => {
    const fromSession = safeParse(sessionStorage.getItem(SESSION_KEY));
    if (fromSession) {
      return fromSession;
    }
    return safeParse(localStorage.getItem(SESSION_KEY));
  };

  const saveSession = (payload, persist) => {
    const serialized = JSON.stringify(payload);
    if (persist) {
      localStorage.setItem(SESSION_KEY, serialized);
      sessionStorage.removeItem(SESSION_KEY);
      return;
    }
    sessionStorage.setItem(SESSION_KEY, serialized);
    localStorage.removeItem(SESSION_KEY);
  };

  const clearSession = () => {
    sessionStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(SESSION_KEY);
  };

  const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const redirect = (url) => {
    window.location.href = url;
  };

  const clearInvalid = (input) => {
    const wrap = input.closest(".input-wrap");
    wrap?.classList.remove("invalid");
    input.removeAttribute("aria-invalid");
  };

  const markInvalid = (input) => {
    const wrap = input.closest(".input-wrap");
    wrap?.classList.add("invalid");
    input.setAttribute("aria-invalid", "true");
  };

  const setMessage = (messageElement, message, type = "") => {
    messageElement.textContent = message;
    messageElement.className = `form-message ${type}`.trim();
  };

  const escapeHtml = (value) =>
    String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");

  const getInitials = (name) => {
    if (!name) {
      return "NA";
    }
    const parts = String(name).trim().split(/\s+/).filter(Boolean);
    if (!parts.length) {
      return "NA";
    }
    if (parts.length === 1) {
      return parts[0].slice(0, 2).toUpperCase();
    }
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  };

  const initLoginPage = () => {
    const session = getSession();
    if (session) {
      redirect("dashboard.html");
      return;
    }

    const form = $("loginForm");
    const emailInput = $("email");
    const passwordInput = $("password");
    const rememberMeInput = $("rememberMe");
    const forgotLink = $("forgotPassword");
    const togglePasswordBtn = $("togglePassword");
    const submitBtn = $("submitBtn");
    const message = $("formMessage");

    if (!form || !emailInput || !passwordInput || !message || !submitBtn) {
      return;
    }

    const rememberedEmail = localStorage.getItem(REMEMBERED_EMAIL_KEY);
    if (rememberedEmail) {
      emailInput.value = rememberedEmail;
      if (rememberMeInput) {
        rememberMeInput.checked = true;
      }
    }

    togglePasswordBtn?.addEventListener("click", () => {
      const reveal = passwordInput.type === "password";
      passwordInput.type = reveal ? "text" : "password";
      togglePasswordBtn.setAttribute("aria-label", reveal ? "Hide password" : "Show password");
    });

    forgotLink?.addEventListener("click", (event) => {
      event.preventDefault();
      setMessage(
        message,
        "Password reset is handled by support. Email support@intelligence.local.",
        "info"
      );
    });

    [emailInput, passwordInput].forEach((input) => {
      input.addEventListener("input", () => {
        clearInvalid(input);
        if (message.classList.contains("error")) {
          setMessage(message, "");
        }
      });
    });

    form.addEventListener("submit", async (event) => {
      event.preventDefault();

      const email = emailInput.value.trim().toLowerCase();
      const password = passwordInput.value;
      let hasError = false;

      clearInvalid(emailInput);
      clearInvalid(passwordInput);

      if (!isValidEmail(email)) {
        markInvalid(emailInput);
        hasError = true;
      }
      if (password.length < 8) {
        markInvalid(passwordInput);
        hasError = true;
      }

      if (hasError) {
        setMessage(message, "Please enter a valid email and password.", "error");
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = "Authenticating...";
      setMessage(message, "Verifying credentials...", "info");

      await wait(850);

      const account = DEMO_ACCOUNTS[email];
      if (!account || account.password !== password) {
        markInvalid(passwordInput);
        setMessage(message, "Invalid email or password. Try the demo account below.", "error");
        submitBtn.disabled = false;
        submitBtn.textContent = "Sign In";
        return;
      }

      const persist = Boolean(rememberMeInput?.checked);
      if (persist) {
        localStorage.setItem(REMEMBERED_EMAIL_KEY, email);
      } else {
        localStorage.removeItem(REMEMBERED_EMAIL_KEY);
      }

      saveSession(
        {
          email,
          name: account.name,
          role: account.role,
          loginAt: new Date().toISOString()
        },
        persist
      );

      setMessage(message, "Authentication successful. Redirecting...", "success");
      submitBtn.textContent = "Success";

      await wait(550);
      redirect("dashboard.html");
    });
  };

  const initDashboardPage = () => {
    const session = getSession();
    if (!session) {
      redirect("index.html");
      return;
    }

    const dashboardShell = document.querySelector(".dashboard-shell");
    const dashboardSidebar = $("dashboardSidebar");
    const sidebarNav = $("sidebarNav");
    const mobileMenuBtn = $("mobileMenuBtn");
    const orgSwitcher = $("orgSwitcher");
    const orgLabel = $("orgLabel");
    const sectionRibbonTitle = document.querySelector(".section-ribbon h3");
    const userMenuBtn = $("userMenuBtn");
    const userMenuPanel = $("userMenuPanel");
    const topbarUserName = $("topbarUserName");
    const currentUser = $("currentUser");
    const currentRole = $("currentRole");
    const loginAt = $("loginAt");
    const logoutBtn = $("logoutBtn");
    const dashboardSearch = $("dashboardSearch");
    const notifyCount = $("notifyCount");
    const alertBadge = $("alertBadge");
    const refreshAlertsBtn = $("refreshAlertsBtn");
    const refreshRecentBtn = $("refreshRecentBtn");

    const riskMeter = $("riskMeter");
    const riskScoreValue = $("riskScoreValue");
    const riskScoreLabel = $("riskScoreLabel");
    const riskEntityLabel = $("riskEntityLabel");
    const affectedAssets = $("affectedAssets");
    const activeAlertsCount = $("activeAlertsCount");
    const activeMentionsCount = $("activeMentionsCount");
    const mentionsDelta = $("mentionsDelta");
    const surfaceCount = $("surfaceCount");
    const darkCount = $("darkCount");
    const sourceDonut = $("sourceDonut");
    const darkPercentLabel = $("darkPercentLabel");
    const surfacePercentLabel = $("surfacePercentLabel");
    const darkWebPercentLabel = $("darkWebPercentLabel");
    const growthDelta = $("growthDelta");
    const suspiciousDomainsCount = $("suspiciousDomainsCount");

    const trendGrid = $("trendGrid");
    const trendYLabels = $("trendYLabels");
    const trendXLabels = $("trendXLabels");
    const trendLinePrimary = $("trendLinePrimary");
    const trendLineSecondary = $("trendLineSecondary");
    const trendPointsPrimary = $("trendPointsPrimary");
    const trendPointsSecondary = $("trendPointsSecondary");
    const periodSwitch = $("periodSwitch");

    const newAlertsList = $("newAlertsList");
    const findingsList = $("findingsList");
    const recentAlertsList = $("recentAlertsList");

    if (!dashboardShell || !logoutBtn || !newAlertsList || !findingsList || !recentAlertsList) {
      return;
    }

    const orgProfiles = [
      {
        org: "acme-corp.com",
        entity: "amity + silvers",
        riskScore: 82,
        affectedAssets: 17,
        activeAlerts: 32,
        mentions: 128,
        mentionsDelta: "+15.1%",
        sourceSurfaceCount: 156,
        sourceDarkCount: 32,
        sourceSurfacePercent: 35,
        sourceDarkPercent: 65,
        sourceGrowth: "+35%",
        suspiciousDomains: 26,
        trendBias: 0
      },
      {
        org: "northstar-finance.io",
        entity: "northstar + vault",
        riskScore: 74,
        affectedAssets: 13,
        activeAlerts: 24,
        mentions: 109,
        mentionsDelta: "+9.4%",
        sourceSurfaceCount: 141,
        sourceDarkCount: 24,
        sourceSurfacePercent: 41,
        sourceDarkPercent: 59,
        sourceGrowth: "+22%",
        suspiciousDomains: 19,
        trendBias: -8
      },
      {
        org: "orbital-grid.net",
        entity: "orbital + transit",
        riskScore: 68,
        affectedAssets: 9,
        activeAlerts: 18,
        mentions: 93,
        mentionsDelta: "+6.8%",
        sourceSurfaceCount: 125,
        sourceDarkCount: 19,
        sourceSurfacePercent: 44,
        sourceDarkPercent: 56,
        sourceGrowth: "+14%",
        suspiciousDomains: 11,
        trendBias: -14
      }
    ];

    const trendSeries = {
      "24h": {
        labels: ["00h", "03h", "06h", "09h", "12h", "15h", "18h", "21h"],
        primary: [104, 118, 112, 125, 132, 124, 138, 146],
        secondary: [66, 72, 68, 74, 80, 76, 82, 88]
      },
      "7d": {
        labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
        primary: [112, 124, 118, 131, 128, 146, 139],
        secondary: [64, 72, 69, 78, 76, 89, 85]
      },
      "30d": {
        labels: ["Apr 1", "Apr 4", "Apr 8", "Apr 12", "Apr 16", "Apr 20", "Apr 24", "Apr 28", "Apr 30"],
        primary: [106, 121, 114, 125, 118, 132, 126, 149, 141],
        secondary: [58, 63, 56, 69, 74, 65, 70, 84, 81]
      }
    };

    const baseNewAlerts = [
      {
        severity: "critical",
        title: "Credential Leak",
        detail: "GRl8ins, acme-c0rp.exine.com",
        time: "5m ago"
      },
      {
        severity: "high",
        title: "Data Leak",
        detail: "acrter onmiscrnes, camoche@eain.com...",
        time: "13m ago"
      },
      {
        severity: "high",
        title: "Exposed Database",
        detail: "Phahs for intressissearch server",
        time: "35m ago"
      },
      {
        severity: "medium",
        title: "Data Leak",
        detail: "Internal documents for sale",
        time: "1h ago"
      }
    ];

    const baseFindings = [
      {
        badge: "1",
        severity: "critical",
        title: "Impersonation",
        detail: "Typosquatted Domains",
        time: "15m"
      },
      {
        badge: "Hig",
        severity: "high",
        title: "Credential Leak",
        detail: "Dark Web, Email emait password paits",
        time: "2m"
      },
      {
        badge: "Hig",
        severity: "high",
        title: "Exposed Database",
        detail: "Open Database;, raooen. Elasrisecards.",
        time: "1m"
      },
      {
        badge: "Hig",
        severity: "critical",
        title: "Ransomware Leak",
        detail: "ACME Corp, h.maneomere nete",
        time: "11m"
      },
      {
        badge: "Mod",
        severity: "medium",
        title: "Vulnerability",
        detail: "Unpatined critical CVE",
        time: "15m"
      }
    ];

    const baseRecentAlerts = [
      {
        severity: "critical",
        title: "Typosquatted",
        detail: "Impersonatnng. Acme-c0rp.com",
        time: "2 minutes ago"
      },
      {
        severity: "critical",
        title: "Dark Web",
        detail: "Leaked email. password",
        time: "4 minutes ago"
      },
      {
        severity: "low",
        title: "Data Leak",
        detail: "Internal documents for sale.",
        time: "9 minutes ago"
      }
    ];

    let orgIndex = 0;
    let currentPeriod = "30d";
    let alertsRotation = 0;
    let recentRotation = 0;

    const severityClass = (value) => {
      if (value === "critical") {
        return "critical";
      }
      if (value === "high") {
        return "high";
      }
      if (value === "medium") {
        return "medium";
      }
      return "low";
    };

    const riskLabelFromScore = (score) => {
      if (score >= 80) {
        return "High Risk";
      }
      if (score >= 60) {
        return "Elevated Risk";
      }
      return "Moderate Risk";
    };

    const rotateBy = (list, offset) => {
      const safeOffset = ((offset % list.length) + list.length) % list.length;
      return [...list.slice(safeOffset), ...list.slice(0, safeOffset)];
    };

    const renderNewAlerts = (items) => {
      newAlertsList.innerHTML = items
        .map(
          (item) => `
            <li class="feed-item" data-search="${escapeHtml(
              `${item.severity} ${item.title} ${item.detail} ${item.time}`
            )}">
              <span class="chip ${severityClass(item.severity)}">
                <i class="chip-icon" aria-hidden="true">&#9650;</i>
                ${escapeHtml(item.severity[0].toUpperCase() + item.severity.slice(1))}
              </span>
              <div>
                <p class="entry-title">${escapeHtml(item.title)}</p>
                <p class="entry-sub">${escapeHtml(item.detail)}</p>
              </div>
              <span class="entry-time">${escapeHtml(item.time)}</span>
            </li>
          `
        )
        .join("");
    };

    const renderFindings = (items) => {
      findingsList.innerHTML = items
        .map(
          (item) => `
            <li class="finding-item" data-search="${escapeHtml(
              `${item.badge} ${item.severity} ${item.title} ${item.detail} ${item.time}`
            )}">
              <span class="chip ${severityClass(item.severity)}">${escapeHtml(item.badge)}</span>
              <div>
                <p class="entry-title">${escapeHtml(item.title)}</p>
                <p class="entry-sub">${escapeHtml(item.detail)}</p>
              </div>
              <span class="entry-time">${escapeHtml(item.time)}</span>
            </li>
          `
        )
        .join("");
    };

    const renderRecentAlerts = (items) => {
      recentAlertsList.innerHTML = items
        .map(
          (item) => `
            <li class="recent-item" data-search="${escapeHtml(
              `${item.severity} ${item.title} ${item.detail} ${item.time}`
            )}">
              <span class="chip ${severityClass(item.severity)}">
                <i class="chip-icon" aria-hidden="true">&#9650;</i>
                ${escapeHtml(item.severity[0].toUpperCase() + item.severity.slice(1))}
              </span>
              <div>
                <p class="entry-title">${escapeHtml(item.title)}</p>
                <p class="entry-sub">${escapeHtml(item.detail)}</p>
              </div>
              <span class="entry-time">${escapeHtml(item.time)}</span>
            </li>
          `
        )
        .join("");
    };

    const applySearch = () => {
      const term = dashboardSearch?.value.trim().toLowerCase() ?? "";
      const allItems = document.querySelectorAll(".feed-item, .finding-item, .recent-item");
      allItems.forEach((item) => {
        const haystack = (item.getAttribute("data-search") ?? "").toLowerCase();
        item.classList.toggle("hidden", Boolean(term) && !haystack.includes(term));
      });
    };

    const updateNotificationCounters = (profile) => {
      const count = Math.max(1, Math.min(9, Math.round(profile.activeAlerts / 4)));
      if (notifyCount) {
        notifyCount.textContent = String(count);
      }
      if (alertBadge) {
        alertBadge.textContent = String(profile.activeAlerts);
      }
    };

    const updateRiskPanel = (profile) => {
      riskMeter?.style.setProperty("--risk-score", String(profile.riskScore));
      if (riskScoreValue) {
        riskScoreValue.textContent = String(profile.riskScore);
      }
      if (riskScoreLabel) {
        riskScoreLabel.textContent = riskLabelFromScore(profile.riskScore);
      }
      if (riskEntityLabel) {
        riskEntityLabel.textContent = profile.entity;
      }
      if (affectedAssets) {
        affectedAssets.textContent = String(profile.affectedAssets);
      }
      if (activeAlertsCount) {
        activeAlertsCount.textContent = String(profile.activeAlerts);
      }
      if (activeMentionsCount) {
        activeMentionsCount.textContent = String(profile.mentions);
      }
      if (mentionsDelta) {
        mentionsDelta.textContent = profile.mentionsDelta;
      }
      if (surfaceCount) {
        surfaceCount.textContent = String(profile.sourceSurfaceCount);
      }
      if (darkCount) {
        darkCount.textContent = String(profile.sourceDarkCount);
      }
      if (sourceDonut) {
        sourceDonut.style.background = `conic-gradient(
          #5dc6ff 0 ${profile.sourceSurfacePercent}%,
          #f6cf64 ${profile.sourceSurfacePercent}% 100%
        )`;
      }
      if (darkPercentLabel) {
        darkPercentLabel.textContent = `${profile.sourceDarkPercent}%`;
      }
      if (surfacePercentLabel) {
        surfacePercentLabel.textContent = `${profile.sourceSurfacePercent}%`;
      }
      if (darkWebPercentLabel) {
        darkWebPercentLabel.textContent = `${profile.sourceDarkPercent}%`;
      }
      if (growthDelta) {
        growthDelta.textContent = profile.sourceGrowth;
      }
      if (suspiciousDomainsCount) {
        suspiciousDomainsCount.textContent = `+${profile.suspiciousDomains}`;
      }
      updateNotificationCounters(profile);
    };

    const renderTrendChart = (period) => {
      const base = trendSeries[period];
      if (
        !base ||
        !trendGrid ||
        !trendYLabels ||
        !trendXLabels ||
        !trendLinePrimary ||
        !trendLineSecondary ||
        !trendPointsPrimary ||
        !trendPointsSecondary
      ) {
        return;
      }

      const currentProfile = orgProfiles[orgIndex];
      const applyBias = (values, multiplier) =>
        values.map((value, index) => {
          const oscillation = Math.round(Math.sin((index + 1) * 1.3) * 3);
          return Math.max(20, value + currentProfile.trendBias * multiplier + oscillation);
        });

      const primaryValues = applyBias(base.primary, 1);
      const secondaryValues = applyBias(base.secondary, 0.55);

      const width = 720;
      const height = 280;
      const padding = { left: 52, right: 18, top: 16, bottom: 34 };
      const maxValue = 200;
      const minValue = 0;
      const usableWidth = width - padding.left - padding.right;
      const usableHeight = height - padding.top - padding.bottom;
      const xStep = usableWidth / (primaryValues.length - 1 || 1);

      const toX = (index) => padding.left + index * xStep;
      const toY = (value) =>
        padding.top + ((maxValue - value) / (maxValue - minValue)) * usableHeight;

      const yTicks = [0, 40, 80, 120, 160, 200];
      trendGrid.innerHTML = yTicks
        .map((tick) => `<line x1="${padding.left}" y1="${toY(tick)}" x2="${width - padding.right}" y2="${toY(tick)}"></line>`)
        .join("");

      trendYLabels.innerHTML = yTicks
        .map(
          (tick) =>
            `<text x="${padding.left - 16}" y="${toY(tick) + 4}" text-anchor="end">${tick}</text>`
        )
        .join("");

      trendXLabels.innerHTML = base.labels
        .map(
          (label, index) =>
            `<text x="${toX(index)}" y="${height - 10}" text-anchor="middle">${escapeHtml(label)}</text>`
        )
        .join("");

      trendLinePrimary.setAttribute(
        "points",
        primaryValues.map((value, index) => `${toX(index)},${toY(value)}`).join(" ")
      );
      trendLineSecondary.setAttribute(
        "points",
        secondaryValues.map((value, index) => `${toX(index)},${toY(value)}`).join(" ")
      );

      trendPointsPrimary.innerHTML = primaryValues
        .map(
          (value, index) =>
            `<circle class="trend-point-primary" cx="${toX(index)}" cy="${toY(value)}" r="4"></circle>`
        )
        .join("");

      trendPointsSecondary.innerHTML = secondaryValues
        .map(
          (value, index) =>
            `<circle class="trend-point-secondary" cx="${toX(index)}" cy="${toY(value)}" r="4"></circle>`
        )
        .join("");
    };

    const updateOrgView = () => {
      const profile = orgProfiles[orgIndex];
      if (orgLabel) {
        orgLabel.textContent = profile.org;
      }
      updateRiskPanel(profile);
      renderTrendChart(currentPeriod);
    };

    const updateUserIdentity = () => {
      const displayName = session.name ?? "Analyst";
      if (topbarUserName) {
        topbarUserName.textContent = displayName;
      }
      if (currentUser) {
        currentUser.textContent = `${displayName} (${session.email})`;
      }
      if (currentRole) {
        currentRole.textContent = session.role ?? "Security Operations";
      }
      if (loginAt) {
        const date = new Date(session.loginAt);
        loginAt.textContent = Number.isNaN(date.getTime()) ? "Unknown" : date.toLocaleString();
      }
    };

    const cycleAlerts = () => {
      alertsRotation += 1;
      renderNewAlerts(rotateBy(baseNewAlerts, alertsRotation));
      renderFindings(rotateBy(baseFindings, alertsRotation % baseFindings.length));
      applySearch();
    };

    const cycleRecentAlerts = () => {
      recentRotation += 1;
      renderRecentAlerts(rotateBy(baseRecentAlerts, recentRotation));
      applySearch();
    };

    sidebarNav?.querySelectorAll(".side-nav-item").forEach((button) => {
      button.addEventListener("click", () => {
        const view = button.getAttribute("data-view");
        if (view === "organization") {
          redirect("organization.html");
          return;
        }
        if (view === "alerts") {
          redirect("alerts.html");
          return;
        }
        if (view === "findings") {
          redirect("findings.html");
          return;
        }
        sidebarNav.querySelectorAll(".side-nav-item").forEach((item) => item.classList.remove("active"));
        button.classList.add("active");
        if (sectionRibbonTitle) {
          const selected = button.querySelector(".nav-label")?.textContent ?? "Dashboard";
          sectionRibbonTitle.textContent = selected;
        }
        if (window.innerWidth <= 1024) {
          dashboardShell.classList.remove("sidebar-open");
        }
      });
    });

    mobileMenuBtn?.addEventListener("click", () => {
      dashboardShell.classList.toggle("sidebar-open");
    });

    document.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }
      if (
        window.innerWidth <= 1024 &&
        dashboardShell.classList.contains("sidebar-open") &&
        !dashboardSidebar?.contains(target) &&
        !mobileMenuBtn?.contains(target)
      ) {
        dashboardShell.classList.remove("sidebar-open");
      }
    });

    orgSwitcher?.addEventListener("click", () => {
      orgIndex = (orgIndex + 1) % orgProfiles.length;
      updateOrgView();
    });

    periodSwitch?.querySelectorAll("button").forEach((button) => {
      button.addEventListener("click", () => {
        const next = button.getAttribute("data-period");
        if (!next || !trendSeries[next]) {
          return;
        }
        currentPeriod = next;
        periodSwitch
          .querySelectorAll("button")
          .forEach((item) => item.classList.toggle("active", item === button));
        renderTrendChart(currentPeriod);
      });
    });

    userMenuBtn?.addEventListener("click", () => {
      const isHidden = userMenuPanel?.hasAttribute("hidden");
      if (isHidden) {
        userMenuPanel?.removeAttribute("hidden");
        userMenuBtn.setAttribute("aria-expanded", "true");
        return;
      }
      userMenuPanel?.setAttribute("hidden", "");
      userMenuBtn?.setAttribute("aria-expanded", "false");
    });

    document.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof Node) || !userMenuPanel || !userMenuBtn) {
        return;
      }
      if (!userMenuPanel.hasAttribute("hidden") && !userMenuPanel.contains(target) && !userMenuBtn.contains(target)) {
        userMenuPanel.setAttribute("hidden", "");
        userMenuBtn.setAttribute("aria-expanded", "false");
      }
    });

    logoutBtn.addEventListener("click", () => {
      clearSession();
      redirect("index.html");
    });

    dashboardSearch?.addEventListener("input", applySearch);

    refreshAlertsBtn?.addEventListener("click", cycleAlerts);
    refreshRecentBtn?.addEventListener("click", cycleRecentAlerts);

    renderNewAlerts(baseNewAlerts);
    renderFindings(baseFindings);
    renderRecentAlerts(baseRecentAlerts);
    updateUserIdentity();
    updateOrgView();
    applySearch();

    window.setInterval(() => {
      const profile = orgProfiles[orgIndex];
      const delta = Math.random() > 0.5 ? 1 : -1;
      profile.mentions = Math.max(20, profile.mentions + delta * 2);
      profile.activeAlerts = Math.max(6, Math.min(80, profile.activeAlerts + (Math.random() > 0.45 ? 1 : -1)));
      profile.riskScore = Math.max(48, Math.min(92, profile.riskScore + delta));
      updateOrgView();
    }, 9000);
  };

  const initAlertsPage = () => {
    const session = getSession();
    if (!session) {
      redirect("index.html");
      return;
    }

    const alertsShell = document.querySelector(".alerts-shell");
    const alertsSidebar = $("alertsSidebar");
    const alertsMobileMenuBtn = $("alertsMobileMenuBtn");
    const alertsSideNav = $("alertsSideNav");
    const alertsTopSearch = $("alertsTopSearch");
    const alertsSearch = $("alertsSearch");
    const alertsCategoryFilter = $("alertsCategoryFilter");
    const alertsSourceFilter = $("alertsSourceFilter");
    const alertsStatusFilter = $("alertsStatusFilter");
    const alertsRangeSwitch = $("alertsRangeSwitch");
    const severityStrip = $("severityStrip");
    const alertsTableBody = $("alertsTableBody");
    const alertsPagingInfo = $("alertsPagingInfo");
    const alertsPager = $("alertsPager");
    const alertsTotalCount = $("alertsTotalCount");
    const underInvestigationCount = $("underInvestigationCount");
    const rangeChipText = $("rangeChipText");
    const alertsUserInitial = $("alertsUserInitial");

    const sevCriticalCount = $("sevCriticalCount");
    const sevHighCount = $("sevHighCount");
    const sevMediumCount = $("sevMediumCount");
    const sevLowCount = $("sevLowCount");

    const alertsChartGrid = $("alertsChartGrid");
    const alertsChartLine = $("alertsChartLine");
    const alertsChartPoints = $("alertsChartPoints");
    const alertsChartLabels = $("alertsChartLabels");

    if (!alertsShell || !alertsTableBody || !alertsPager || !alertsPagingInfo) {
      return;
    }

    const summaryCounts = {
      critical: 8,
      high: 21,
      medium: 9,
      low: 12,
      total: 50
    };

    const alertSeed = [
      { title: "Credential Leak Found on Dark Web", severity: "critical", category: "Credential Leak", source: "Breach Forums", confidence: 95, status: "Investigating" },
      { title: "Typosquatting Domain Detected", severity: "critical", category: "Phishing", source: "hxxps://acn3corp.com", confidence: 90, status: "Investigating" },
      { title: "Acme Corp Credentials Exposed", severity: "critical", category: "Credential Leak", source: "Pastebin", confidence: 87, status: "Investigating" },
      { title: "Data Leak Mentioned on Dark Web", severity: "high", category: "Data Leak", source: "Hidden Marketplace", confidence: 85, status: "New" },
      { title: "Acme Exec Email Found in Data Dump", severity: "high", category: "Credential Leak", source: "PasteSite", confidence: 80, status: "Investigating" },
      { title: "Phishing Campaign Targeting Employees", severity: "medium", category: "Phishing", source: "Darktrace", confidence: 75, status: "New" },
      { title: "Acme RDP Server Found Vulnerable", severity: "medium", category: "Exposed Service", source: "Shodan", confidence: 70, status: "New" },
      { title: "Acme Database Info Exposed Online", severity: "low", category: "Database Leak", source: "LeakBase", confidence: 65, status: "New" },
      { title: "Employee List Shared on Pastebin", severity: "low", category: "Data Leak", source: "Pastebin", confidence: 60, status: "New" },
      { title: "Suspicious Login Burst from TOR", severity: "high", category: "Credential Leak", source: "Threat Exchange", confidence: 82, status: "Investigating" },
      { title: "Executive Wallet Mentioned in Forum", severity: "medium", category: "Data Leak", source: "Surface Forum", confidence: 73, status: "New" }
    ];

    const relativeDates = [
      "1 hour ago",
      "2 days ago",
      "5 days ago",
      "1 day ago",
      "6 days ago",
      "3 days ago",
      "7 days ago",
      "2 days ago",
      "1 week ago",
      "4 hours ago",
      "8 days ago"
    ];

    const alertsData = Array.from({ length: 33 }, (_, index) => {
      const seed = alertSeed[index % alertSeed.length];
      const confidenceDelta = ((index * 3) % 9) - 4;
      const confidence = Math.max(52, Math.min(97, seed.confidence + confidenceDelta));
      const status = index % 4 === 0 ? "Investigating" : seed.status;

      return {
        id: index + 1,
        title: seed.title,
        severity: seed.severity,
        category: seed.category,
        source: seed.source,
        confidence,
        date: relativeDates[index % relativeDates.length],
        status
      };
    });

    const chartSeries = {
      "24h": {
        labels: ["01h", "04h", "07h", "10h", "13h", "16h", "20h", "23h"],
        values: [220, 188, 204, 250, 300, 240, 275, 325]
      },
      "7d": {
        labels: ["21 Jan", "26", "7G", "30G", "2 Feb", "7 Feb", "12 Feb", "20 Feb"],
        values: [260, 202, 236, 304, 232, 281, 298, 342]
      },
      "30d": {
        labels: ["Apr 1", "Apr 5", "Apr 9", "Apr 13", "Apr 18", "Apr 22", "Apr 26", "Apr 30"],
        values: [180, 210, 245, 226, 288, 268, 301, 364]
      }
    };

    const severitySymbol = {
      critical: "C",
      high: "H",
      medium: "M",
      low: "L"
    };

    const activeLevels = new Set(["critical", "high", "medium", "low"]);
    let activeRange = "7d";
    let currentPage = 1;
    const pageSize = 10;
    let searchTerm = "";

    const syncSearch = (value, source) => {
      const next = value ?? "";
      if (source !== "top" && alertsTopSearch) {
        alertsTopSearch.value = next;
      }
      if (source !== "inline" && alertsSearch) {
        alertsSearch.value = next;
      }
      searchTerm = next.trim().toLowerCase();
      currentPage = 1;
      render();
    };

    const getFilteredAlerts = () =>
      alertsData.filter((item) => {
        if (!activeLevels.has(item.severity)) {
          return false;
        }
        if (alertsCategoryFilter && alertsCategoryFilter.value !== "all" && item.category !== alertsCategoryFilter.value) {
          return false;
        }
        if (alertsSourceFilter && alertsSourceFilter.value !== "all" && item.source !== alertsSourceFilter.value) {
          return false;
        }
        if (alertsStatusFilter && alertsStatusFilter.value !== "all" && item.status !== alertsStatusFilter.value) {
          return false;
        }
        if (searchTerm) {
          const haystack = `${item.title} ${item.category} ${item.source} ${item.status}`.toLowerCase();
          if (!haystack.includes(searchTerm)) {
            return false;
          }
        }
        return true;
      });

    const renderPager = (pageCount) => {
      if (!alertsPager) {
        return;
      }

      const pageButtons = Array.from({ length: pageCount }, (_, i) => i + 1)
        .map(
          (page) =>
            `<button type="button" class="${page === currentPage ? "active" : ""}" data-page="${page}">${page}</button>`
        )
        .join("");

      alertsPager.innerHTML = `
        <button type="button" data-page="${Math.max(1, currentPage - 1)}">Prev</button>
        ${pageButtons}
        <button type="button" data-page="${Math.min(pageCount, currentPage + 1)}">Next</button>
      `;
    };

    const renderChart = (visibleCount) => {
      const base = chartSeries[activeRange];
      if (!base || !alertsChartGrid || !alertsChartLine || !alertsChartPoints || !alertsChartLabels) {
        return;
      }

      const width = 340;
      const height = 130;
      const padding = { left: 10, right: 10, top: 8, bottom: 22 };
      const maxValue = 450;
      const usableWidth = width - padding.left - padding.right;
      const usableHeight = height - padding.top - padding.bottom;
      const xStep = usableWidth / (base.values.length - 1 || 1);

      const loadFactor = Math.max(0.62, Math.min(1.35, visibleCount / 16 + 0.25));
      const levelFactor = Math.max(0.55, activeLevels.size / 4 + 0.25);
      const values = base.values.map((value, index) => {
        const wobble = index % 2 === 0 ? 8 : -6;
        return Math.min(430, Math.max(40, Math.round(value * loadFactor * levelFactor + wobble)));
      });

      const toX = (index) => padding.left + index * xStep;
      const toY = (value) => padding.top + ((maxValue - value) / maxValue) * usableHeight;

      const yTicks = [0, 150, 300, 450];
      alertsChartGrid.innerHTML = yTicks
        .map(
          (tick) =>
            `<line x1="${padding.left}" y1="${toY(tick)}" x2="${width - padding.right}" y2="${toY(tick)}"></line>`
        )
        .join("");

      alertsChartLine.setAttribute(
        "points",
        values.map((value, index) => `${toX(index)},${toY(value)}`).join(" ")
      );

      alertsChartPoints.innerHTML = values
        .map(
          (value, index) =>
            `<circle class="alerts-chart-point" cx="${toX(index)}" cy="${toY(value)}" r="3.6"></circle>`
        )
        .join("");

      alertsChartLabels.innerHTML = base.labels
        .map(
          (label, index) =>
            `<text x="${toX(index)}" y="${height - 6}" text-anchor="middle">${escapeHtml(label)}</text>`
        )
        .join("");
    };

    const renderTable = (rows) => {
      if (!alertsTableBody) {
        return;
      }

      if (!rows.length) {
        alertsTableBody.innerHTML = `
          <tr>
            <td colspan="7">
              <div class="empty-state">No alerts match your current filters.</div>
            </td>
          </tr>
        `;
        return;
      }

      alertsTableBody.innerHTML = rows
        .map(
          (item) => `
            <tr>
              <td>
                <span class="table-severity ${item.severity}">
                  <span>&#9888;</span>
                  ${severitySymbol[item.severity]}
                </span>
                <a class="table-title-link" href="alert-details.html?id=${item.id}">${escapeHtml(item.title)}</a>
              </td>
              <td>${escapeHtml(item.category)}</td>
              <td>${escapeHtml(item.source)}</td>
              <td>
                <div class="confidence-cell">
                  <div class="confidence-bar"><span style="width:${item.confidence}%"></span></div>
                  <span>${item.confidence}%</span>
                </div>
              </td>
              <td>${escapeHtml(item.date)}</td>
              <td>
                <select class="status-select ${item.status.toLowerCase()}" data-id="${item.id}">
                  <option value="Investigating" ${item.status === "Investigating" ? "selected" : ""}>Investigating</option>
                  <option value="New" ${item.status === "New" ? "selected" : ""}>New</option>
                </select>
              </td>
              <td>
                <div class="table-actions">
                  <button type="button" class="table-action-btn js-view-alert" data-id="${item.id}" title="View">&#128269;</button>
                  <button type="button" class="table-action-btn" title="More">&#9679;</button>
                </div>
              </td>
            </tr>
          `
        )
        .join("");
    };

    const render = () => {
      const filtered = getFilteredAlerts();
      const totalFiltered = filtered.length;
      const pageCount = Math.max(1, Math.ceil(totalFiltered / pageSize));
      currentPage = Math.min(currentPage, pageCount);

      const startIndex = (currentPage - 1) * pageSize;
      const pageRows = filtered.slice(startIndex, startIndex + pageSize);
      const shownStart = totalFiltered ? startIndex + 1 : 0;
      const shownEnd = totalFiltered ? startIndex + pageRows.length : 0;

      renderTable(pageRows);
      renderPager(pageCount);
      renderChart(totalFiltered);

      if (alertsPagingInfo) {
        alertsPagingInfo.textContent = `Showing: ${shownStart} to ${shownEnd} of ${totalFiltered}`;
      }
      if (rangeChipText) {
        rangeChipText.textContent = `${shownStart} - ${shownEnd} Alerts`;
      }
      if (underInvestigationCount) {
        underInvestigationCount.textContent = String(
          filtered.filter((item) => item.status === "Investigating").length
        );
      }
    };

    alertsTableBody.addEventListener("change", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLSelectElement) || !target.classList.contains("status-select")) {
        return;
      }
      const id = Number(target.getAttribute("data-id"));
      const row = alertsData.find((item) => item.id === id);
      if (!row) {
        return;
      }
      row.status = target.value === "Investigating" ? "Investigating" : "New";
      currentPage = 1;
      render();
    });

    alertsTableBody.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }
      const viewButton = target.closest(".js-view-alert");
      if (!(viewButton instanceof HTMLButtonElement)) {
        return;
      }
      const id = Number(viewButton.getAttribute("data-id"));
      if (!Number.isInteger(id) || id <= 0) {
        return;
      }
      redirect(`alert-details.html?id=${id}`);
    });

    alertsPager.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLButtonElement)) {
        return;
      }
      const page = Number(target.getAttribute("data-page"));
      if (!Number.isFinite(page) || page <= 0) {
        return;
      }
      currentPage = page;
      render();
    });

    severityStrip?.querySelectorAll("button[data-level]").forEach((button) => {
      button.addEventListener("click", () => {
        const level = button.getAttribute("data-level");
        if (!level) {
          return;
        }
        if (activeLevels.has(level) && activeLevels.size === 1) {
          return;
        }
        if (activeLevels.has(level)) {
          activeLevels.delete(level);
          button.classList.remove("active");
        } else {
          activeLevels.add(level);
          button.classList.add("active");
        }
        currentPage = 1;
        render();
      });
    });

    alertsRangeSwitch?.querySelectorAll("button[data-range]").forEach((button) => {
      button.addEventListener("click", () => {
        const range = button.getAttribute("data-range");
        if (!range || !chartSeries[range]) {
          return;
        }
        activeRange = range;
        alertsRangeSwitch
          .querySelectorAll("button[data-range]")
          .forEach((item) => item.classList.toggle("active", item === button));
        render();
      });
    });

    alertsCategoryFilter?.addEventListener("change", () => {
      currentPage = 1;
      render();
    });
    alertsSourceFilter?.addEventListener("change", () => {
      currentPage = 1;
      render();
    });
    alertsStatusFilter?.addEventListener("change", () => {
      currentPage = 1;
      render();
    });

    alertsSearch?.addEventListener("input", () => syncSearch(alertsSearch.value, "inline"));
    alertsTopSearch?.addEventListener("input", () => syncSearch(alertsTopSearch.value, "top"));

    alertsSideNav?.querySelectorAll("button[data-route]").forEach((button) => {
      button.addEventListener("click", () => {
        const route = button.getAttribute("data-route");
        if (route && route !== "alerts.html") {
          redirect(route);
        }
      });
    });

    alertsMobileMenuBtn?.addEventListener("click", () => {
      alertsShell.classList.toggle("sidebar-open");
    });

    document.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }
      if (
        window.innerWidth <= 1024 &&
        alertsShell.classList.contains("sidebar-open") &&
        !alertsSidebar?.contains(target) &&
        !alertsMobileMenuBtn?.contains(target)
      ) {
        alertsShell.classList.remove("sidebar-open");
      }
    });

    const sources = [...new Set(alertsData.map((item) => item.source))].sort((a, b) =>
      a.localeCompare(b)
    );
    if (alertsSourceFilter) {
      alertsSourceFilter.innerHTML = `
        <option value="all">All Sources</option>
        ${sources.map((source) => `<option value="${escapeHtml(source)}">${escapeHtml(source)}</option>`).join("")}
      `;
    }

    if (alertsTotalCount) {
      alertsTotalCount.textContent = String(summaryCounts.total);
    }
    if (sevCriticalCount) {
      sevCriticalCount.textContent = String(summaryCounts.critical);
    }
    if (sevHighCount) {
      sevHighCount.textContent = String(summaryCounts.high);
    }
    if (sevMediumCount) {
      sevMediumCount.textContent = String(summaryCounts.medium);
    }
    if (sevLowCount) {
      sevLowCount.textContent = String(summaryCounts.low);
    }
    if (alertsUserInitial) {
      alertsUserInitial.textContent = getInitials(session.name);
    }

    render();
  };

  const initFindingsPage = () => {
    const session = getSession();
    if (!session) {
      redirect("index.html");
      return;
    }

    const findingsShell = document.querySelector(".findings-shell");
    const findingsSidebar = $("findingsSidebar");
    const findingsMobileMenuBtn = $("findingsMobileMenuBtn");
    const findingsSideNav = $("findingsSideNav");
    const findingsOrgSwitcher = $("findingsOrgSwitcher");
    const findingsOrgLabel = $("findingsOrgLabel");
    const findingsTopSearch = $("findingsTopSearch");
    const findingsUserInitial = $("findingsUserInitial");

    const findingsTabs = $("findingsTabs");
    const findingsStateFilter = $("findingsStateFilter");
    const findingsTotalCount = $("findingsTotalCount");
    const findingsChipRow = $("findingsChipRow");
    const markIgnoredSeenBtn = $("markIgnoredSeenBtn");
    const findingsTableBody = $("findingsTableBody");
    const findingsPagingInfo = $("findingsPagingInfo");
    const findingsPager = $("findingsPager");

    const chipSurfaceCount = $("chipSurfaceCount");
    const chipLeakCount = $("chipLeakCount");
    const chipDomainCount = $("chipDomainCount");
    const chipDocumentCount = $("chipDocumentCount");
    const chipBrandCount = $("chipBrandCount");
    const chipVulnerabilityCount = $("chipVulnerabilityCount");

    if (
      !findingsShell ||
      !findingsTableBody ||
      !findingsPager ||
      !findingsPagingInfo ||
      !findingsTabs ||
      !findingsChipRow
    ) {
      return;
    }

    const seedFindings = [
      {
        title: "Email:Password Pairs Exposed on Dark Web",
        detail: "Acme accounts listed in a fresh leak bundle.",
        category: "leak",
        source: "Leak Site",
        sourceDetail: "Breach Forums",
        attribute: "Credential Leak",
        attributeDetail: "@acme-corp.com",
        similarity: 95
      },
      {
        title: "Internal Acme Document Shared on Pastebin",
        detail: "Policy draft observed in public paste source.",
        category: "document",
        source: "PasteSite",
        sourceDetail: "Surface Archive",
        attribute: "Document Mention",
        attributeDetail: "acme-corp.com",
        similarity: 93
      },
      {
        title: "New Typosquatting Domain Detected",
        detail: "Possible phishing domain mirrors employee login.",
        category: "domain",
        source: "Domain Monitor",
        sourceDetail: "Registrar Feed",
        attribute: "Brand Abuse",
        attributeDetail: "acme-c0rp.com",
        similarity: 87
      },
      {
        title: "ACME Zero-Day Vulnerability Discussed",
        detail: "Exploit reference posted in security forum thread.",
        category: "vulnerability",
        source: "Surface Web",
        sourceDetail: "Security Forum",
        attribute: "Vulnerability Mention",
        attributeDetail: "CVE watchlist",
        similarity: 82
      },
      {
        title: "ACME Employee List Shared on Dark Web",
        detail: "Directory-style dump references internal roles.",
        category: "leak",
        source: "Dark Web",
        sourceDetail: "Breach Forums",
        attribute: "Data Leak",
        attributeDetail: "employee roster",
        similarity: 80
      },
      {
        title: "Stolen Acme Data Offered for Sale",
        detail: "Actor advertising compressed corporate archive.",
        category: "surface",
        source: "Marketplace",
        sourceDetail: "Hidden Marketplace",
        attribute: "Leak Source",
        attributeDetail: "dataset listing",
        similarity: 78
      },
      {
        title: "Potential Data Leak Mentioned on Telegram",
        detail: "Threat actor claims access to finance documents.",
        category: "brand",
        source: "OpSec Channel",
        sourceDetail: "Telegram",
        attribute: "Brand Mention",
        attributeDetail: "acmesecure",
        similarity: 78
      },
      {
        title: "Sensitive AWS Keys Published to Gist",
        detail: "Repository mirror exposed credential-like secrets.",
        category: "surface",
        source: "Code Paste",
        sourceDetail: "Public gist mirror",
        attribute: "Cloud Exposure",
        attributeDetail: "@acme-security.com",
        similarity: 72
      },
      {
        title: "Executive Name Targeted in Spoofed Campaign",
        detail: "Campaign template impersonates CFO signature.",
        category: "brand",
        source: "Mail Telemetry",
        sourceDetail: "Inbound Gateway",
        attribute: "Impersonation",
        attributeDetail: "Sarah Johnson",
        similarity: 85
      },
      {
        title: "Third-Party Vendor Mentioned in Breach Thread",
        detail: "Vendor stack tied to potential chain compromise.",
        category: "document",
        source: "Surface Web",
        sourceDetail: "Threat thread",
        attribute: "Supply Chain",
        attributeDetail: "acme-payments",
        similarity: 74
      }
    ];

    const relativeTimes = [
      "5m ago",
      "1h ago",
      "2h ago",
      "3h ago",
      "6h ago",
      "7h ago",
      "8h ago",
      "10h ago",
      "1d ago",
      "2d ago"
    ];

    const categoryLabel = {
      all: "All Sources",
      surface: "Surface Web",
      leak: "Leak Source",
      domain: "Domain Monitoring",
      document: "Document Mention",
      brand: "Brand Abuse",
      vulnerability: "Vulnerability Mention"
    };

    const stateValues = ["New", "Updated", "Duplicate", "Ignored"];
    const dispositionValues = ["New", "Accepted", "Escalated", "Investigating"];
    const activeChips = new Set(["surface", "leak", "domain", "document", "brand", "vulnerability"]);

    const findingsData = Array.from({ length: 42 }, (_, index) => {
      const seed = seedFindings[index % seedFindings.length];
      const similarityShift = ((index * 2) % 9) - 4;
      const similarity = Math.max(56, Math.min(98, seed.similarity + similarityShift));
      const state = stateValues[(index + 1) % stateValues.length];
      const disposition = state === "Ignored" ? "Accepted" : dispositionValues[index % dispositionValues.length];

      return {
        id: index + 1,
        title: seed.title,
        detail: seed.detail,
        category: seed.category,
        source: seed.source,
        sourceDetail: seed.sourceDetail,
        attribute: seed.attribute,
        attributeDetail: seed.attributeDetail,
        similarity,
        timestamp: relativeTimes[index % relativeTimes.length],
        state,
        disposition,
        ignoredSeen: state !== "Ignored" ? true : index % 2 === 0
      };
    });

    let activeCategory = "all";
    let stateFilter = "all";
    let searchTerm = "";
    let currentPage = 1;
    const pageSize = 8;

    const getStateClass = (state) => String(state).toLowerCase().replaceAll(" ", "-");

    const getFilteredFindings = () =>
      findingsData.filter((item) => {
        if (activeCategory !== "all" && item.category !== activeCategory) {
          return false;
        }
        if (!activeChips.has(item.category)) {
          return false;
        }
        if (stateFilter !== "all" && item.state !== stateFilter) {
          return false;
        }
        if (searchTerm) {
          const haystack =
            `${item.title} ${item.detail} ${item.source} ${item.sourceDetail} ` +
            `${item.attribute} ${item.attributeDetail} ${item.timestamp} ${item.state}`.toLowerCase();
          if (!haystack.includes(searchTerm)) {
            return false;
          }
        }
        return true;
      });

    const renderChipCounts = () => {
      const counts = {
        surface: 0,
        leak: 0,
        domain: 0,
        document: 0,
        brand: 0,
        vulnerability: 0
      };

      findingsData.forEach((item) => {
        if (Object.prototype.hasOwnProperty.call(counts, item.category)) {
          counts[item.category] += 1;
        }
      });

      if (chipSurfaceCount) {
        chipSurfaceCount.textContent = String(counts.surface);
      }
      if (chipLeakCount) {
        chipLeakCount.textContent = String(counts.leak);
      }
      if (chipDomainCount) {
        chipDomainCount.textContent = String(counts.domain);
      }
      if (chipDocumentCount) {
        chipDocumentCount.textContent = String(counts.document);
      }
      if (chipBrandCount) {
        chipBrandCount.textContent = String(counts.brand);
      }
      if (chipVulnerabilityCount) {
        chipVulnerabilityCount.textContent = String(counts.vulnerability);
      }
    };

    const renderPager = (pageCount) => {
      findingsPager.innerHTML = `
        <button type="button" data-page="${Math.max(1, currentPage - 1)}">Prev</button>
        ${Array.from({ length: pageCount }, (_, i) => i + 1)
          .map((page) => `<button type="button" class="${page === currentPage ? "active" : ""}" data-page="${page}">${page}</button>`)
          .join("")}
        <button type="button" data-page="${Math.min(pageCount, currentPage + 1)}">Next</button>
      `;
    };

    const renderTable = (rows) => {
      if (!rows.length) {
        findingsTableBody.innerHTML = `
          <tr>
            <td colspan="7">
              <div class="empty-state">No findings match your current filters.</div>
            </td>
          </tr>
        `;
        return;
      }

      findingsTableBody.innerHTML = rows
        .map(
          (item) => `
            <tr>
              <td>
                <div class="finding-event">
                  <span class="finding-icon ${escapeHtml(item.category)}">&#9679;</span>
                  <div class="finding-text">
                    <strong>${escapeHtml(item.title)}</strong>
                    <p>${escapeHtml(item.detail)}</p>
                  </div>
                </div>
              </td>
              <td>
                <div class="finding-meta">
                  <strong>${escapeHtml(item.source)}</strong>
                  <p>${escapeHtml(item.sourceDetail)}</p>
                </div>
              </td>
              <td>
                <div class="finding-meta">
                  <strong>${escapeHtml(item.attribute)}</strong>
                  <p>${escapeHtml(item.attributeDetail)}</p>
                </div>
              </td>
              <td>
                <div class="similarity-cell">
                  <div class="similarity-bar"><span style="width:${item.similarity}%"></span></div>
                  <span>${item.similarity}%</span>
                </div>
              </td>
              <td>${escapeHtml(item.timestamp)}</td>
              <td>
                <select class="finding-state-select ${getStateClass(item.state)}" data-id="${item.id}">
                  ${stateValues
                    .map(
                      (state) =>
                        `<option value="${state}" ${item.state === state ? "selected" : ""}>${state}</option>`
                    )
                    .join("")}
                </select>
              </td>
              <td>
                <div class="finding-actions">
                  <button type="button" class="finding-action-btn js-open-alert-details" data-id="${item.id}">View</button>
                  <select class="finding-disposition-select" data-id="${item.id}">
                    ${dispositionValues
                      .map(
                        (value) =>
                          `<option value="${value}" ${item.disposition === value ? "selected" : ""}>${value}</option>`
                      )
                      .join("")}
                  </select>
                </div>
              </td>
            </tr>
          `
        )
        .join("");
    };

    const updateIgnoredButton = () => {
      const unseenIgnoredCount = findingsData.filter((item) => item.state === "Ignored" && !item.ignoredSeen).length;
      if (!markIgnoredSeenBtn) {
        return;
      }
      markIgnoredSeenBtn.textContent =
        unseenIgnoredCount > 0 ? `Mark ${unseenIgnoredCount} Ignored As Seen` : "Ignored Findings Reviewed";
      markIgnoredSeenBtn.disabled = unseenIgnoredCount === 0;
    };

    const render = () => {
      const filtered = getFilteredFindings();
      const totalFiltered = filtered.length;
      const pageCount = Math.max(1, Math.ceil(totalFiltered / pageSize));
      currentPage = Math.min(currentPage, pageCount);

      const startIndex = (currentPage - 1) * pageSize;
      const pageRows = filtered.slice(startIndex, startIndex + pageSize);
      const shownStart = totalFiltered ? startIndex + 1 : 0;
      const shownEnd = totalFiltered ? startIndex + pageRows.length : 0;

      renderTable(pageRows);
      renderPager(pageCount);
      updateIgnoredButton();

      if (findingsPagingInfo) {
        findingsPagingInfo.textContent = `Showing: ${shownStart} to ${shownEnd} of ${totalFiltered}`;
      }
      if (findingsTotalCount) {
        findingsTotalCount.textContent = String(totalFiltered);
      }
    };

    findingsTabs.querySelectorAll("button[data-category]").forEach((button) => {
      button.addEventListener("click", () => {
        const nextCategory = button.getAttribute("data-category");
        if (!nextCategory || !categoryLabel[nextCategory]) {
          return;
        }
        activeCategory = nextCategory;
        findingsTabs
          .querySelectorAll("button[data-category]")
          .forEach((item) => item.classList.toggle("active", item === button));
        currentPage = 1;
        render();
      });
    });

    findingsChipRow.querySelectorAll("button[data-chip]").forEach((button) => {
      button.addEventListener("click", () => {
        const chip = button.getAttribute("data-chip");
        if (!chip || !activeChips.has(chip) && activeChips.size === 0) {
          return;
        }

        if (activeChips.has(chip)) {
          if (activeChips.size === 1) {
            return;
          }
          activeChips.delete(chip);
          button.classList.remove("active");
        } else {
          activeChips.add(chip);
          button.classList.add("active");
        }

        currentPage = 1;
        render();
      });
    });

    findingsTopSearch?.addEventListener("input", () => {
      searchTerm = findingsTopSearch.value.trim().toLowerCase();
      currentPage = 1;
      render();
    });

    findingsStateFilter?.addEventListener("change", () => {
      stateFilter = findingsStateFilter.value;
      currentPage = 1;
      render();
    });

    findingsTableBody.addEventListener("change", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLSelectElement)) {
        return;
      }

      const id = Number(target.getAttribute("data-id"));
      const row = findingsData.find((item) => item.id === id);
      if (!row) {
        return;
      }

      if (target.classList.contains("finding-state-select")) {
        row.state = stateValues.includes(target.value) ? target.value : row.state;
        if (row.state === "Ignored") {
          row.ignoredSeen = false;
        } else {
          row.ignoredSeen = true;
        }
        currentPage = 1;
        render();
      }

      if (target.classList.contains("finding-disposition-select")) {
        row.disposition = dispositionValues.includes(target.value) ? target.value : row.disposition;
      }
    });

    findingsTableBody.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }
      const openButton = target.closest(".js-open-alert-details");
      if (!(openButton instanceof HTMLButtonElement)) {
        return;
      }
      const id = Number(openButton.getAttribute("data-id"));
      if (!Number.isInteger(id) || id <= 0) {
        return;
      }
      redirect(`alert-details.html?id=${id}`);
    });

    markIgnoredSeenBtn?.addEventListener("click", () => {
      findingsData.forEach((item) => {
        if (item.state === "Ignored") {
          item.ignoredSeen = true;
          if (item.disposition === "New") {
            item.disposition = "Accepted";
          }
        }
      });
      render();
    });

    findingsPager.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLButtonElement)) {
        return;
      }
      const page = Number(target.getAttribute("data-page"));
      if (!Number.isFinite(page) || page <= 0) {
        return;
      }
      currentPage = page;
      render();
    });

    findingsSideNav?.querySelectorAll("button[data-route]").forEach((button) => {
      button.addEventListener("click", () => {
        const route = button.getAttribute("data-route");
        if (route && route !== "findings.html") {
          redirect(route);
        }
      });
    });

    findingsMobileMenuBtn?.addEventListener("click", () => {
      findingsShell.classList.toggle("sidebar-open");
    });

    document.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }
      if (
        window.innerWidth <= 1024 &&
        findingsShell.classList.contains("sidebar-open") &&
        !findingsSidebar?.contains(target) &&
        !findingsMobileMenuBtn?.contains(target)
      ) {
        findingsShell.classList.remove("sidebar-open");
      }
    });

    findingsOrgSwitcher?.addEventListener("click", () => {
      const domains = ["acme-corp.com", "northstar-finance.io", "orbital-grid.net"];
      const currentIndex = domains.indexOf(findingsOrgLabel?.textContent ?? domains[0]);
      const nextIndex = (currentIndex + 1 + domains.length) % domains.length;
      if (findingsOrgLabel) {
        findingsOrgLabel.textContent = domains[nextIndex];
      }
    });

    if (findingsUserInitial) {
      findingsUserInitial.textContent = getInitials(session.name);
    }

    renderChipCounts();
    render();
  };

  const initAlertDetailsPage = () => {
    const session = getSession();
    if (!session) {
      redirect("index.html");
      return;
    }

    const detailShell = document.querySelector(".detail-shell");
    const detailSidebar = $("detailSidebar");
    const detailMobileMenuBtn = $("detailMobileMenuBtn");
    const detailSideNav = $("detailSideNav");
    const detailSearch = $("detailSearch");
    const detailOrgButton = $("detailOrgButton");
    const detailOrgDomain = $("detailOrgDomain");
    const detailUserInitial = $("detailUserInitial");

    const detailAlertTitle = $("detailAlertTitle");
    const detailSeverityBadge = $("detailSeverityBadge");
    const detailEntityChip = $("detailEntityChip");
    const detailConfidence = $("detailConfidence");
    const detailSummary = $("detailSummary");
    const detailDomainTags = $("detailDomainTags");
    const detailSourceLink = $("detailSourceLink");
    const detailEvidenceTitle = $("detailEvidenceTitle");
    const detailEvidenceMeta = $("detailEvidenceMeta");
    const detailEvidenceRows = $("detailEvidenceRows");
    const detailRelatedEvents = $("detailRelatedEvents");
    const detailEventRange = $("detailEventRange");
    const detailStatusHistory = $("detailStatusHistory");
    const detailCommentForm = $("detailCommentForm");
    const detailCommentInput = $("detailCommentInput");
    const detailCategory = $("detailCategory");
    const detailFirstSeen = $("detailFirstSeen");
    const detailLastSeen = $("detailLastSeen");
    const detailSourceName = $("detailSourceName");
    const detailLinkedEntities = $("detailLinkedEntities");
    const detailRecommendation = $("detailRecommendation");
    const detailStatusSelect = $("detailStatusSelect");
    const detailAuditLog = $("detailAuditLog");

    if (
      !detailShell ||
      !detailAlertTitle ||
      !detailSeverityBadge ||
      !detailConfidence ||
      !detailSummary ||
      !detailRelatedEvents ||
      !detailStatusHistory ||
      !detailStatusSelect ||
      !detailAuditLog
    ) {
      return;
    }

    const detailSeed = [
      {
        title: "Credential Leak Found on Dark Web",
        severity: "critical",
        category: "Credential Leak",
        source: "Breach Forums",
        sourceUrl: "https://breachforums.st",
        confidence: 95,
        status: "Investigating",
        summary: "AcmeCorp email domain closely matches leaked credentials from a recent forum dump.",
        orgDomain: "acme-corp.com",
        entityChip: "Acme Corporation, AcmeSoft",
        domains: ["@acme-corp.com", "@acmesoft.com"],
        linkedEntities: ["@acme-corp.com", "@acmesoft.com", "AcmeSoft"],
        recommendation: "Reset passwords of impacted accounts, enforce MFA, and review privileged access logs."
      },
      {
        title: "Typosquatting Domain Detected",
        severity: "critical",
        category: "Phishing",
        source: "Threat Exchange",
        sourceUrl: "https://threatexchange.example",
        confidence: 90,
        status: "Investigating",
        summary: "A domain visually similar to the company login portal is hosting active phishing content.",
        orgDomain: "acme-corp.com",
        entityChip: "Acme Corporation, Brand Protection",
        domains: ["acn3corp.com", "acme-c0rp.com"],
        linkedEntities: ["acn3corp.com", "acme-c0rp.com", "Brand Protection"],
        recommendation: "Takedown typosquatting domains and update mail gateway blocklists."
      },
      {
        title: "Acme Corp Credentials Exposed",
        severity: "critical",
        category: "Credential Leak",
        source: "Pastebin",
        sourceUrl: "https://pastebin.com",
        confidence: 87,
        status: "Investigating",
        summary: "Multiple employee credentials were published in a public paste with recent timestamps.",
        orgDomain: "acme-corp.com",
        entityChip: "Acme Corporation, SOC Team",
        domains: ["@acme-corp.com", "@acme-security.com"],
        linkedEntities: ["@acme-corp.com", "@acme-security.com", "SOC Team"],
        recommendation: "Rotate leaked credentials and force re-authentication on high-risk systems."
      },
      {
        title: "Data Leak Mentioned on Dark Web",
        severity: "high",
        category: "Data Leak",
        source: "Hidden Marketplace",
        sourceUrl: "https://hiddenmarket.example",
        confidence: 85,
        status: "New",
        summary: "A seller claims to possess internal records and is offering samples for verification.",
        orgDomain: "acme-corp.com",
        entityChip: "Acme Corporation, Data Governance",
        domains: ["acme-corp.com", "internal.acme-corp.com"],
        linkedEntities: ["internal.acme-corp.com", "Data Governance"],
        recommendation: "Validate leaked samples and begin legal notice and containment workflow."
      },
      {
        title: "Acme Exec Email Found in Data Dump",
        severity: "high",
        category: "Credential Leak",
        source: "PasteSite",
        sourceUrl: "https://pastesite.example",
        confidence: 80,
        status: "Investigating",
        summary: "Executive email appears in a breached corpus linked to reused credentials.",
        orgDomain: "acme-corp.com",
        entityChip: "Executive Office, Acme Corp",
        domains: ["@acme-corp.com"],
        linkedEntities: ["Executive Office", "@acme-corp.com"],
        recommendation: "Rotate executive credentials and apply phishing-resistant MFA enrollment."
      },
      {
        title: "Phishing Campaign Targeting Employees",
        severity: "medium",
        category: "Phishing",
        source: "Darktrace",
        sourceUrl: "https://darktrace.com",
        confidence: 75,
        status: "New",
        summary: "Multiple users received payload links from spoofed sender identities.",
        orgDomain: "acme-corp.com",
        entityChip: "Security Awareness, Acme Corp",
        domains: ["@acme-corp.com", "mail-acme-secure.com"],
        linkedEntities: ["mail-acme-secure.com", "Security Awareness"],
        recommendation: "Block sender infrastructure and trigger employee phishing simulation follow-up."
      },
      {
        title: "Acme RDP Server Found Vulnerable",
        severity: "medium",
        category: "Exposed Service",
        source: "Shodan",
        sourceUrl: "https://www.shodan.io",
        confidence: 70,
        status: "New",
        summary: "Internet-exposed host is reporting vulnerable RDP fingerprint and outdated patch level.",
        orgDomain: "acme-corp.com",
        entityChip: "Infrastructure Team, Acme Corp",
        domains: ["rdp.acme-corp.com"],
        linkedEntities: ["rdp.acme-corp.com", "Infrastructure Team"],
        recommendation: "Restrict exposure, patch host immediately, and enforce VPN-only remote access."
      },
      {
        title: "Acme Database Info Exposed Online",
        severity: "low",
        category: "Database Leak",
        source: "LeakBase",
        sourceUrl: "https://leakbase.example",
        confidence: 65,
        status: "New",
        summary: "Metadata for internal database resources appears in a public leak index.",
        orgDomain: "acme-corp.com",
        entityChip: "DBA Team, Acme Corp",
        domains: ["db.acme-corp.com"],
        linkedEntities: ["db.acme-corp.com", "DBA Team"],
        recommendation: "Validate data scope, rotate affected keys, and remove exposed metadata endpoints."
      }
    ];

    const timePool = [
      "1 hour ago",
      "2 days ago",
      "5 days ago",
      "1 day ago",
      "6 days ago",
      "3 days ago",
      "7 days ago",
      "2 hours ago",
      "4 hours ago",
      "1 week ago"
    ];

    const severityLabel = {
      critical: "Critical",
      high: "High",
      medium: "Medium",
      low: "Low"
    };

    const statusTone = {
      Investigating: "Investigating",
      New: "New",
      Resolved: "Resolved"
    };

    const nowTime = () =>
      new Date().toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit"
      });

    const toIsoDate = (value) =>
      String(value)
        .toLowerCase()
        .replaceAll(" ", "-");

    const buildDetail = (id) => {
      const index = (id - 1) % detailSeed.length;
      const seed = detailSeed[index];
      const confidenceBase = Math.max(52, Math.min(97, seed.confidence + ((id * 3) % 7) - 3));

      return {
        id,
        title: seed.title,
        severity: seed.severity,
        category: seed.category,
        source: seed.source,
        sourceUrl: seed.sourceUrl,
        confidence: confidenceBase,
        status: seed.status,
        summary: seed.summary,
        orgDomain: seed.orgDomain,
        entityChip: seed.entityChip,
        domains: [...seed.domains],
        linkedEntities: [...seed.linkedEntities],
        recommendation: seed.recommendation,
        firstSeen: timePool[(index + 1) % timePool.length],
        lastSeen: timePool[(index + 6) % timePool.length],
        evidenceTitle: `${seed.title} - evidence snapshot`,
        evidenceMeta: `${seed.source} - ${seed.category}`,
        evidenceRows: [
          {
            email: `john.doe${id}@${seed.orgDomain}`,
            hash: `sha256:f3c9${id}e0b81f6a20d8a4c${id}71d1e5b9`,
            confidence: confidenceBase
          }
        ],
        relatedEvents: [
          {
            title: seed.title,
            source: seed.source,
            time: timePool[(index + 4) % timePool.length],
            range: "24h"
          },
          {
            title: `${seed.category} signal from alternate source`,
            source: "Surface Web",
            time: timePool[(index + 3) % timePool.length],
            range: "7d"
          },
          {
            title: `Historical ${seed.category.toLowerCase()} mention`,
            source: "Threat Archive",
            time: timePool[(index + 8) % timePool.length],
            range: "30d"
          }
        ],
        statusHistory: [
          {
            user: "John Doe",
            text: "Alert is under investigation and evidence validation is in progress.",
            time: "1 min ago"
          },
          {
            user: "John Doe",
            text: "Alert created from source correlation and matching indicators.",
            time: timePool[(index + 1) % timePool.length]
          }
        ],
        auditLog: [
          {
            user: "John Doe",
            action: `Alert created: ${seed.title}`,
            source: seed.source,
            time: "1 min ago"
          },
          {
            user: "John Doe",
            action: "Matching evidence attached",
            source: seed.source,
            time: timePool[(index + 1) % timePool.length]
          }
        ]
      };
    };

    const query = new URLSearchParams(window.location.search);
    const parsedId = Number(query.get("id"));
    const alertId = Number.isInteger(parsedId) && parsedId > 0 ? parsedId : 1;

    let selectedRange = "7d";
    let searchTerm = "";
    const detail = buildDetail(alertId);

    const renderTagList = (target, items, className) => {
      if (!target) {
        return;
      }
      target.innerHTML = items
        .map((item) => `<span class="${className}" data-search="${escapeHtml(item)}">${escapeHtml(item)}</span>`)
        .join("");
    };

    const renderEvidenceRows = () => {
      if (!detailEvidenceRows) {
        return;
      }
      detailEvidenceRows.innerHTML = detail.evidenceRows
        .map(
          (row) => `
            <tr>
              <td>${escapeHtml(row.email)}</td>
              <td>${escapeHtml(row.hash)}</td>
              <td>${escapeHtml(String(row.confidence))}%</td>
            </tr>
          `
        )
        .join("");
    };

    const renderRelatedEvents = () => {
      if (!detailRelatedEvents) {
        return;
      }

      const filtered = detail.relatedEvents.filter((item) => {
        if (selectedRange !== "all" && item.range !== selectedRange) {
          return false;
        }
        if (searchTerm) {
          const haystack = `${item.title} ${item.source} ${item.time}`.toLowerCase();
          if (!haystack.includes(searchTerm)) {
            return false;
          }
        }
        return true;
      });

      if (!filtered.length) {
        detailRelatedEvents.innerHTML = `<li class="detail-empty">No related events in this view.</li>`;
        return;
      }

      detailRelatedEvents.innerHTML = filtered
        .map(
          (item) => `
            <li data-search="${escapeHtml(`${item.title} ${item.source}`)}">
              <div>
                <strong>${escapeHtml(item.title)}</strong>
                <p>${escapeHtml(item.source)}</p>
              </div>
              <span>${escapeHtml(item.time)}</span>
            </li>
          `
        )
        .join("");
    };

    const renderStatusHistory = () => {
      if (!detailStatusHistory) {
        return;
      }

      const filtered = detail.statusHistory.filter((item) => {
        if (!searchTerm) {
          return true;
        }
        const haystack = `${item.user} ${item.text} ${item.time}`.toLowerCase();
        return haystack.includes(searchTerm);
      });

      if (!filtered.length) {
        detailStatusHistory.innerHTML = `<li class="detail-empty">No status history matches your search.</li>`;
        return;
      }

      detailStatusHistory.innerHTML = filtered
        .map(
          (item) => `
            <li data-search="${escapeHtml(`${item.user} ${item.text}`)}">
              <div class="detail-history-user">${escapeHtml(item.user)}</div>
              <p>${escapeHtml(item.text)}</p>
              <span>${escapeHtml(item.time)}</span>
            </li>
          `
        )
        .join("");
    };

    const renderAuditLog = () => {
      if (!detailAuditLog) {
        return;
      }

      const filtered = detail.auditLog.filter((item) => {
        if (!searchTerm) {
          return true;
        }
        const haystack = `${item.user} ${item.action} ${item.source} ${item.time}`.toLowerCase();
        return haystack.includes(searchTerm);
      });

      if (!filtered.length) {
        detailAuditLog.innerHTML = `<li class="detail-empty">No audit records match your search.</li>`;
        return;
      }

      detailAuditLog.innerHTML = filtered
        .map(
          (item) => `
            <li data-search="${escapeHtml(`${item.user} ${item.action} ${item.source}`)}">
              <strong>${escapeHtml(item.user)}</strong>
              <p>${escapeHtml(item.action)}</p>
              <small>${escapeHtml(item.source)} - ${escapeHtml(item.time)}</small>
            </li>
          `
        )
        .join("");
    };

    const render = () => {
      detailAlertTitle.textContent = detail.title;
      detailSeverityBadge.textContent = severityLabel[detail.severity] ?? detail.severity;
      detailSeverityBadge.className = `detail-severity-badge ${toIsoDate(detail.severity)}`;
      if (detailEntityChip) {
        detailEntityChip.textContent = detail.entityChip;
      }
      detailConfidence.textContent = `${detail.confidence}%`;
      detailSummary.textContent = detail.summary;

      if (detailSourceLink) {
        detailSourceLink.href = detail.sourceUrl;
        detailSourceLink.textContent = detail.sourceUrl;
      }
      if (detailEvidenceTitle) {
        detailEvidenceTitle.textContent = detail.evidenceTitle;
      }
      if (detailEvidenceMeta) {
        detailEvidenceMeta.textContent = detail.evidenceMeta;
      }
      if (detailCategory) {
        detailCategory.textContent = detail.category;
      }
      if (detailFirstSeen) {
        detailFirstSeen.textContent = detail.firstSeen;
      }
      if (detailLastSeen) {
        detailLastSeen.textContent = detail.lastSeen;
      }
      if (detailSourceName) {
        detailSourceName.textContent = detail.source;
      }
      if (detailRecommendation) {
        detailRecommendation.textContent = detail.recommendation;
      }
      if (detailStatusSelect) {
        detailStatusSelect.value = statusTone[detail.status] ?? "Investigating";
      }
      if (detailOrgDomain) {
        detailOrgDomain.textContent = detail.orgDomain;
      }

      renderTagList(detailDomainTags, detail.domains, "detail-tag");
      renderTagList(detailLinkedEntities, detail.linkedEntities, "detail-entity-tag");
      renderEvidenceRows();
      renderRelatedEvents();
      renderStatusHistory();
      renderAuditLog();
    };

    detailEventRange?.addEventListener("change", () => {
      selectedRange = detailEventRange.value;
      renderRelatedEvents();
    });

    detailStatusSelect?.addEventListener("change", () => {
      detail.status = detailStatusSelect.value;
      detail.statusHistory.unshift({
        user: session.name,
        text: `Status updated to ${detail.status}.`,
        time: "just now"
      });
      detail.auditLog.unshift({
        user: session.name,
        action: `Status changed to ${detail.status}`,
        source: detail.source,
        time: nowTime()
      });
      detail.statusHistory = detail.statusHistory.slice(0, 8);
      detail.auditLog = detail.auditLog.slice(0, 8);
      renderStatusHistory();
      renderAuditLog();
    });

    detailCommentForm?.addEventListener("submit", (event) => {
      event.preventDefault();
      const comment = detailCommentInput?.value.trim() ?? "";
      if (!comment) {
        return;
      }

      detail.statusHistory.unshift({
        user: session.name,
        text: comment,
        time: "just now"
      });
      detail.auditLog.unshift({
        user: session.name,
        action: `Comment added: ${comment}`,
        source: detail.source,
        time: nowTime()
      });
      detail.statusHistory = detail.statusHistory.slice(0, 8);
      detail.auditLog = detail.auditLog.slice(0, 8);

      if (detailCommentInput) {
        detailCommentInput.value = "";
      }

      renderStatusHistory();
      renderAuditLog();
    });

    detailSearch?.addEventListener("input", () => {
      searchTerm = detailSearch.value.trim().toLowerCase();
      renderRelatedEvents();
      renderStatusHistory();
      renderAuditLog();
    });

    detailSideNav?.querySelectorAll("button[data-route]").forEach((button) => {
      button.addEventListener("click", () => {
        const route = button.getAttribute("data-route");
        if (!route) {
          return;
        }
        if (route === "alerts.html") {
          redirect(route);
          return;
        }
        redirect(route);
      });
    });

    detailMobileMenuBtn?.addEventListener("click", () => {
      detailShell.classList.toggle("sidebar-open");
    });

    document.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }
      if (
        window.innerWidth <= 1024 &&
        detailShell.classList.contains("sidebar-open") &&
        !detailSidebar?.contains(target) &&
        !detailMobileMenuBtn?.contains(target)
      ) {
        detailShell.classList.remove("sidebar-open");
      }
    });

    detailOrgButton?.addEventListener("click", () => {
      const domains = ["acme-corp.com", "northstar-finance.io", "orbital-grid.net"];
      const currentIndex = domains.indexOf(detail.orgDomain);
      const nextIndex = (currentIndex + 1 + domains.length) % domains.length;
      detail.orgDomain = domains[nextIndex];
      if (detailOrgDomain) {
        detailOrgDomain.textContent = detail.orgDomain;
      }
    });

    if (detailUserInitial) {
      detailUserInitial.textContent = getInitials(session.name);
    }

    render();
  };

  const initOrganizationPage = () => {
    const session = getSession();
    if (!session) {
      redirect("index.html");
      return;
    }

    const orgShell = document.querySelector(".org-shell");
    const orgSidebar = $("orgSidebar");
    const orgSideNav = $("orgSideNav");
    const orgMobileMenuBtn = $("orgMobileMenuBtn");
    const orgDomainSwitcher = $("orgDomainSwitcher");
    const orgDomainLabel = $("orgDomainLabel");
    const orgSearch = $("orgSearch");
    const orgUserInitial = $("orgUserInitial");

    const orgCompanyName = $("orgCompanyName");
    const orgCompanyDomain = $("orgCompanyDomain");
    const primaryDomain = $("primaryDomain");
    const monitoringStatus = $("monitoringStatus");
    const orgAlertsCount = $("orgAlertsCount");
    const orgAlertsMeta = $("orgAlertsMeta");
    const orgSuspiciousCount = $("orgSuspiciousCount");
    const orgSuspiciousMeta = $("orgSuspiciousMeta");
    const orgVulnerabilitiesCount = $("orgVulnerabilitiesCount");
    const orgVulnerabilitiesMeta = $("orgVulnerabilitiesMeta");

    const alternateDomainsList = $("alternateDomainsList");
    const brandNamesList = $("brandNamesList");
    const executiveNamesList = $("executiveNamesList");
    const emailDomainsList = $("emailDomainsList");
    const keywordsTags = $("keywordsTags");
    const productNamesTags = $("productNamesTags");
    const assetExternalIps = $("assetExternalIps");
    const assetAltFroms = $("assetAltFroms");
    const assetSubdomains = $("assetSubdomains");
    const assetCriticalSub = $("assetCriticalSub");
    const subsidiariesList = $("subsidiariesList");
    const geoFocusTags = $("geoFocusTags");
    const verifiedEmailDomainsList = $("verifiedEmailDomainsList");
    const departmentTags = $("departmentTags");
    const geoRegionsTags = $("geoRegionsTags");

    if (!orgShell || !alternateDomainsList || !keywordsTags || !monitoringStatus) {
      return;
    }

    const profiles = [
      {
        companyName: "Acme Corporation",
        domain: "acme-corp.com",
        primaryDomain: "acme-corp.com",
        monitoringStatus: "active",
        alertsCount: 32,
        alertsMeta: "7 active cases",
        suspiciousCount: 14,
        suspiciousMeta: "5 investigating",
        vulnerabilitiesCount: 9,
        vulnerabilitiesMeta: "4 this week",
        alternateDomains: ["acme-security.com", "acme-software.com", "acmecorp.net"],
        brandNames: ["AcmeSoft", "AcmeSecure", "AcmeCloud"],
        executiveNames: ["John Acme (CEO)", "Sarah Johnson (CFO)", "Michael Smith (CTO)"],
        emailDomains: ["@acme-corp.com", "@acmesoft.com"],
        keywords: ["Acme", "AcmeCorp", "AcmeSoft", "SecureVault", "hack", "leak"],
        productNames: ["SecureVault", "CyberGuard", "CloudSafe", "CloudSafe Pro"],
        assetSummary: { externalIps: 77, altFroms: 26, subdomains: 56, criticalSub: 4 },
        subsidiaries: ["Acme Europe GmbH", "Acme Asia Pte Ltd"],
        geoFocus: ["USA", "Germany", "Singapore", "India", "INT"],
        verifiedEmailDomains: ["@acme-corp.com", "@acmesoft.com"],
        departmentTags: ["IT", "Finance", "HR", "DevOps", "Marketing"],
        geoRegions: ["USA", "Germany", "Singapore", "India"]
      },
      {
        companyName: "Northstar Finance",
        domain: "northstar-finance.io",
        primaryDomain: "northstar-finance.io",
        monitoringStatus: "active",
        alertsCount: 24,
        alertsMeta: "5 active cases",
        suspiciousCount: 9,
        suspiciousMeta: "3 investigating",
        vulnerabilitiesCount: 6,
        vulnerabilitiesMeta: "2 this week",
        alternateDomains: ["northstar-secure.io", "northstarfinance.net", "northstar-vault.com"],
        brandNames: ["NorthVault", "StarLedger", "NorthSafe"],
        executiveNames: ["Emma Clark (CEO)", "Jason Lee (CFO)", "Priya Nair (CTO)"],
        emailDomains: ["@northstar-finance.io", "@northsafe.io"],
        keywords: ["Northstar", "Vault", "fraud", "phish", "credential"],
        productNames: ["NorthVault", "LedgerCore", "SafeBank API"],
        assetSummary: { externalIps: 61, altFroms: 18, subdomains: 43, criticalSub: 3 },
        subsidiaries: ["Northstar UK Ltd", "Northstar SEA Pvt Ltd"],
        geoFocus: ["USA", "UK", "Singapore", "UAE"],
        verifiedEmailDomains: ["@northstar-finance.io", "@northsafe.io"],
        departmentTags: ["Risk", "Finance", "SOC", "Engineering"],
        geoRegions: ["USA", "UK", "Singapore", "UAE"]
      },
      {
        companyName: "Orbital Grid Systems",
        domain: "orbital-grid.net",
        primaryDomain: "orbital-grid.net",
        monitoringStatus: "review",
        alertsCount: 18,
        alertsMeta: "3 active cases",
        suspiciousCount: 7,
        suspiciousMeta: "2 investigating",
        vulnerabilitiesCount: 5,
        vulnerabilitiesMeta: "1 this week",
        alternateDomains: ["orbitalcloud.net", "grid-ops.io", "orbitalgrid.co"],
        brandNames: ["OrbitalOps", "GridShield", "TransitWatch"],
        executiveNames: ["Daniel Brooks (CEO)", "Anna Meyer (CFO)", "Ravi Kumar (CISO)"],
        emailDomains: ["@orbital-grid.net", "@orbitalops.net"],
        keywords: ["Orbital", "Grid", "botnet", "ransom", "malware"],
        productNames: ["GridShield", "TransitWatch", "Orbital NOC"],
        assetSummary: { externalIps: 49, altFroms: 14, subdomains: 37, criticalSub: 2 },
        subsidiaries: ["Orbital Logistics Ltd", "Orbital Mobility GmbH"],
        geoFocus: ["Germany", "India", "Japan", "Australia"],
        verifiedEmailDomains: ["@orbital-grid.net", "@orbitalops.net"],
        departmentTags: ["Operations", "NOC", "Security", "Engineering"],
        geoRegions: ["Germany", "India", "Japan", "Australia"]
      }
    ];

    const listIcons = {
      alternateDomains: "&#127760;",
      brandNames: "&#127970;",
      executiveNames: "&#128100;",
      emailDomains: "&#9993;",
      subsidiaries: "&#127758;",
      verifiedEmailDomains: "&#10003;"
    };

    const itemPresets = {
      alternateDomains: (index) => `new-domain-${index}.com`,
      brandNames: (index) => `Brand${index}`,
      executiveNames: (index) => `Executive ${index} (VP)`,
      emailDomains: (index) => `@newmail${index}.com`,
      keywords: (index) => `keyword${index}`,
      productNames: (index) => `Product${index}`,
      subsidiaries: (index) => `Subsidiary ${index} Ltd`,
      geoFocus: (index) => `Region${index}`,
      verifiedEmailDomains: (index) => `@verified${index}.com`,
      departmentTags: (index) => `Dept${index}`,
      geoRegions: (index) => `Geo${index}`
    };

    let profileIndex = 0;

    const renderList = (target, items, key) => {
      if (!target) {
        return;
      }
      const icon = listIcons[key] ?? "&#8226;";
      target.innerHTML = items
        .map(
          (item) => `
            <li data-search="${escapeHtml(item)}">
              <span><em class="org-item-icon" aria-hidden="true">${icon}</em>${escapeHtml(item)}</span>
              <button type="button" aria-label="Edit">&#9998;</button>
            </li>
          `
        )
        .join("");
    };

    const renderTags = (target, items) => {
      if (!target) {
        return;
      }
      target.innerHTML = items
        .map((item) => `<span class="org-tag" data-search="${escapeHtml(item)}">${escapeHtml(item)}</span>`)
        .join("");
    };

    const applyOrgSearch = () => {
      const term = orgSearch?.value.trim().toLowerCase() ?? "";
      const targets = document.querySelectorAll(".org-list li[data-search], .org-tag[data-search]");
      targets.forEach((node) => {
        const haystack = (node.getAttribute("data-search") ?? "").toLowerCase();
        node.classList.toggle("hidden", Boolean(term) && !haystack.includes(term));
      });
    };

    const renderProfile = () => {
      const profile = profiles[profileIndex];

      if (orgDomainLabel) {
        orgDomainLabel.textContent = profile.domain;
      }
      if (orgCompanyName) {
        orgCompanyName.textContent = profile.companyName;
      }
      if (orgCompanyDomain) {
        orgCompanyDomain.textContent = profile.domain;
      }
      if (primaryDomain) {
        primaryDomain.textContent = profile.primaryDomain;
      }
      if (monitoringStatus) {
        monitoringStatus.value = profile.monitoringStatus;
      }
      if (orgAlertsCount) {
        orgAlertsCount.textContent = String(profile.alertsCount);
      }
      if (orgAlertsMeta) {
        orgAlertsMeta.textContent = profile.alertsMeta;
      }
      if (orgSuspiciousCount) {
        orgSuspiciousCount.textContent = String(profile.suspiciousCount);
      }
      if (orgSuspiciousMeta) {
        orgSuspiciousMeta.textContent = profile.suspiciousMeta;
      }
      if (orgVulnerabilitiesCount) {
        orgVulnerabilitiesCount.textContent = String(profile.vulnerabilitiesCount);
      }
      if (orgVulnerabilitiesMeta) {
        orgVulnerabilitiesMeta.textContent = profile.vulnerabilitiesMeta;
      }

      renderList(alternateDomainsList, profile.alternateDomains, "alternateDomains");
      renderList(brandNamesList, profile.brandNames, "brandNames");
      renderList(executiveNamesList, profile.executiveNames, "executiveNames");
      renderList(emailDomainsList, profile.emailDomains, "emailDomains");
      renderTags(keywordsTags, profile.keywords);
      renderTags(productNamesTags, profile.productNames);
      renderList(subsidiariesList, profile.subsidiaries, "subsidiaries");
      renderTags(geoFocusTags, profile.geoFocus);
      renderList(verifiedEmailDomainsList, profile.verifiedEmailDomains, "verifiedEmailDomains");
      renderTags(departmentTags, profile.departmentTags);
      renderTags(geoRegionsTags, profile.geoRegions);

      if (assetExternalIps) {
        assetExternalIps.textContent = String(profile.assetSummary.externalIps);
      }
      if (assetAltFroms) {
        assetAltFroms.textContent = `alt froms: ${profile.assetSummary.altFroms}`;
      }
      if (assetSubdomains) {
        assetSubdomains.textContent = String(profile.assetSummary.subdomains);
      }
      if (assetCriticalSub) {
        assetCriticalSub.textContent = `critical: ${profile.assetSummary.criticalSub}`;
      }

      applyOrgSearch();
    };

    const addTargetItem = (targetName) => {
      const profile = profiles[profileIndex];
      const key = targetName;
      if (!key || !(key in profile) || !Array.isArray(profile[key])) {
        return;
      }
      const nextIndex = profile[key].length + 1;
      const generator = itemPresets[key];
      const nextValue = generator ? generator(nextIndex) : `Item ${nextIndex}`;
      profile[key].push(nextValue);
      renderProfile();
    };

    orgDomainSwitcher?.addEventListener("click", () => {
      profileIndex = (profileIndex + 1) % profiles.length;
      renderProfile();
    });

    monitoringStatus?.addEventListener("change", () => {
      const profile = profiles[profileIndex];
      profile.monitoringStatus = monitoringStatus.value;
    });

    orgSearch?.addEventListener("input", applyOrgSearch);

    document.querySelectorAll(".org-tool-btn[data-add-target]").forEach((button) => {
      button.addEventListener("click", () => {
        const target = button.getAttribute("data-add-target");
        addTargetItem(target);
      });
    });

    orgSideNav?.querySelectorAll("button[data-route]").forEach((button) => {
      button.addEventListener("click", () => {
        const route = button.getAttribute("data-route");
        if (route && route !== "organization.html") {
          redirect(route);
        }
      });
    });

    orgMobileMenuBtn?.addEventListener("click", () => {
      orgShell.classList.toggle("sidebar-open");
    });

    document.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }
      if (
        window.innerWidth <= 1024 &&
        orgShell.classList.contains("sidebar-open") &&
        !orgSidebar?.contains(target) &&
        !orgMobileMenuBtn?.contains(target)
      ) {
        orgShell.classList.remove("sidebar-open");
      }
    });

    if (orgUserInitial) {
      orgUserInitial.textContent = getInitials(session.name);
    }

    renderProfile();
  };

  document.addEventListener("DOMContentLoaded", () => {
    if (document.body.dataset.page === "dashboard") {
      initDashboardPage();
      return;
    }
    if (document.body.dataset.page === "alerts") {
      initAlertsPage();
      return;
    }
    if (document.body.dataset.page === "findings") {
      initFindingsPage();
      return;
    }
    if (document.body.dataset.page === "alert-details") {
      initAlertDetailsPage();
      return;
    }
    if (document.body.dataset.page === "organization") {
      initOrganizationPage();
      return;
    }
    initLoginPage();
  });
})();
