const normalizeRole = (role) => String(role || "").toLowerCase();

export const getRoleKey = (role) => {
  const normalizedRole = normalizeRole(role);
  if (["patient", "psychologist", "admin"].includes(normalizedRole)) {
    return normalizedRole;
  }
  return "patient";
};

export const isPsychologistInterviewNotification = (notification, role) => {
  if (getRoleKey(role) !== "psychologist") return false;
  const targetUrl = String(notification?.target_url || "");
  const message = String(notification?.message || "").toLowerCase();
  return targetUrl.startsWith("/psychologist/interview/") || message.includes("interview");
};

export const getPsychologistInterviewWaitingTarget = () => "/psychologist/approval-waiting?interview=1";

export const getNotificationTarget = (notification, role) => {
  const roleKey = getRoleKey(role);
  const targetUrl = notification?.target_url;
  if (isPsychologistInterviewNotification(notification, role)) {
    return getPsychologistInterviewWaitingTarget();
  }
  if (typeof targetUrl === "string" && targetUrl.startsWith("/") && !targetUrl.startsWith("//")) {
    return targetUrl;
  }

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
