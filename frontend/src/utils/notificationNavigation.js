const normalizeRole = (role) => String(role || "").toLowerCase();

export const getRoleKey = (role) => {
  const normalizedRole = normalizeRole(role);
  if (["patient", "psychologist", "admin"].includes(normalizedRole)) {
    return normalizedRole;
  }
  return "patient";
};

export const getNotificationTarget = (notification, role) => {
  const targetUrl = notification?.target_url;
  if (typeof targetUrl === "string" && targetUrl.startsWith("/") && !targetUrl.startsWith("//")) {
    return targetUrl;
  }

  const roleKey = getRoleKey(role);
  const message = String(notification?.message || "").toLowerCase();

  if (roleKey === "admin") {
    if (message.includes("application")) {
      return "/admin/applications";
    }
    return "/admin/dashboard";
  }

  if (roleKey === "psychologist") {
    if (message.includes("message") || message.includes("file")) {
      return "/psychologist/messages";
    }
    if (message.includes("appointment")) {
      return "/psychologist/appointments";
    }
    if (message.includes("interview") || message.includes("application")) {
      return "/psychologist/approval-waiting";
    }
    return "/psychologist/home";
  }

  if (message.includes("message") || message.includes("file")) {
    return "/patient/messages";
  }
  if (message.includes("appointment")) {
    return "/patient/appointments";
  }
  return "/patient/home";
};
