const API_BASE_URL = "http://127.0.0.1:8000";

async function apiRequest(endpoint, options = {}) {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      data?.detail || "Something went wrong"
    );
  }

  return data;
}

// --------------------------------------------------
// Authentication
// --------------------------------------------------

export async function loginUser(email, password) {
  return apiRequest("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({
      email,
      password,
    }),
  });
}

// --------------------------------------------------
// Tickets
// --------------------------------------------------

export async function getTickets(accessToken) {
  return apiRequest("/api/tickets", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

export async function getTicket(accessToken, ticketId) {
  return apiRequest(`/api/tickets/${ticketId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

export async function updateTicketStatus(
  accessToken,
  ticketId,
  status
) {
  return apiRequest(`/api/tickets/${ticketId}/status`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      status,
    }),
  });
}

export async function createTicket(
  accessToken,
  ticketData
) {
  return apiRequest("/api/tickets", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      title: ticketData.title,
      description: ticketData.description,
      category_id: ticketData.category_id || null,
      priority: ticketData.priority,
    }),
  });
}

// --------------------------------------------------
// Ticket Rating
// --------------------------------------------------

export async function rateTicket(
  accessToken,
  ticketId,
  ratingData
) {
  return apiRequest(`/api/tickets/${ticketId}/rating`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      rating: ratingData.rating,
      feedback: ratingData.feedback?.trim() || null,
    }),
  });
}

// --------------------------------------------------
// AI Support
// --------------------------------------------------

export async function analyzeTicketWithAI(
  accessToken,
  ticketId
) {
  return apiRequest(
    `/api/ai/tickets/${ticketId}/analyze`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );
}

// --------------------------------------------------
// Knowledge Base
// --------------------------------------------------

export async function getKnowledgeBaseArticles(
  accessToken
) {
  return apiRequest("/api/knowledge-base", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

export async function getKnowledgeBaseArticle(
  accessToken,
  articleId
) {
  return apiRequest(
    `/api/knowledge-base/${articleId}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );
}

export async function createKnowledgeBaseArticle(
  accessToken,
  articleData
) {
  return apiRequest("/api/knowledge-base", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      title: articleData.title,
      content: articleData.content,
      category_id: articleData.category_id ?? null,
      is_published:
        articleData.is_published ?? true,
    }),
  });
}

export async function updateKnowledgeBaseArticle(
  accessToken,
  articleId,
  articleData
) {
  return apiRequest(
    `/api/knowledge-base/${articleId}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        title: articleData.title,
        content: articleData.content,
        category_id: articleData.category_id ?? null,
        is_published: articleData.is_published,
      }),
    }
  );
}

export async function updateKnowledgeBasePublishStatus(
  accessToken,
  articleId,
  isPublished
) {
  return apiRequest(
    `/api/knowledge-base/${articleId}/publish?is_published=${isPublished}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );
}

export async function deleteKnowledgeBaseArticle(
  accessToken,
  articleId
) {
  return apiRequest(
    `/api/knowledge-base/${articleId}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );
}

// --------------------------------------------------
// Categories
// --------------------------------------------------

export async function getCategories(accessToken) {
  return apiRequest("/api/categories", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

// --------------------------------------------------
// Comments
// --------------------------------------------------

export async function getTicketComments(
  accessToken,
  ticketId
) {
  return apiRequest(
    `/api/tickets/${ticketId}/comments`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );
}

export async function createTicketComment(
  accessToken,
  ticketId,
  commentData
) {
  return apiRequest(
    `/api/tickets/${ticketId}/comments`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        comment: commentData.comment,
        is_internal:
          commentData.is_internal || false,
      }),
    }
  );
}

// --------------------------------------------------
// Attachments
// --------------------------------------------------

export async function getTicketAttachments(
  accessToken,
  ticketId
) {
  return apiRequest(
    `/api/tickets/${ticketId}/attachments`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );
}

export async function uploadTicketAttachment(
  accessToken,
  ticketId,
  file
) {
  const formData = new FormData();

  formData.append("file", file);

  const response = await fetch(
    `${API_BASE_URL}/api/tickets/${ticketId}/attachments`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: formData,
    }
  );

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      data?.detail ||
        "Failed to upload attachment."
    );
  }

  return data;
}

export async function downloadTicketAttachment(
  accessToken,
  ticketId,
  attachmentId,
  fileName
) {
  const response = await fetch(
    `${API_BASE_URL}/api/tickets/${ticketId}/attachments/${attachmentId}/download`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    const data = await response.json().catch(() => null);

    throw new Error(
      data?.detail ||
        "Failed to download attachment."
    );
  }

  const blob = await response.blob();

  const downloadUrl = window.URL.createObjectURL(blob);

  const link = document.createElement("a");

  link.href = downloadUrl;
  link.download = fileName;

  document.body.appendChild(link);
  link.click();
  link.remove();

  window.URL.revokeObjectURL(downloadUrl);
}

// --------------------------------------------------
// Admin - Users
// --------------------------------------------------

export async function getUsers(accessToken) {
  return apiRequest("/api/users", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

export async function updateUser(
  accessToken,
  userId,
  userData
) {
  return apiRequest(`/api/users/${userId}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      name: userData.name,
      email: userData.email,
      password: userData.password || null,
      role_id: userData.role_id,
      team_id: userData.team_id,
    }),
  });
}

// --------------------------------------------------
// Admin - Teams
// --------------------------------------------------

export async function getTeams(accessToken) {
  return apiRequest("/api/teams", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

// --------------------------------------------------
// Admin - Ticket Assignment
// --------------------------------------------------

export async function updateTicketAssignment(
  accessToken,
  ticketId,
  assignmentData
) {
  return apiRequest(
    `/api/tickets/${ticketId}/assignment`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        assigned_to:
          assignmentData.assigned_to ?? null,
        team_id:
          assignmentData.team_id ?? null,
      }),
    }
  );
}