export type HealthResponse = {
  status: string;
  service: string;
};

export async function getHealth(): Promise<HealthResponse> {
  const response = await fetch('/api/health');

  if (!response.ok) {
    throw new Error('Backend unavailable');
  }

  return response.json();
}



// Ancienne version :
// export async function getHealth() {
//   const response = await fetch('/api/health');

//   if (!response.ok)
//     throw new Error('Backend unavailable');

//   return await response.json();
// }


// export async function getHealth()
// fonction que l'on pourra utiliser partout dans l'application.

// const response = await fetch('/api/health');
// un fetch basique comme en php
// Attention ! En PHP, c'était généralement le navigateur qui demandait une nouvelle page au serveur. Ici, React reste sur la même page et envoie une requête HTTP en arrière-plan.
// C'est exactement comme si le navigateur faisait https://localhost/api/health
// ou plutot curl -k https://localhost/api/health  en bash et l'on stoque la reponse
// Sauf que cette fois, c'est React qui le fait.


// if (!response.ok)
//     throw new Error('Backend unavailable');
// C'est une bonne habitude dès le début.


// return await response.json();
// Le backend renvoie :
// {
//     "status": "ok",
//     "service": "backend"
// }
// Cette ligne transforme le JSON en objet JavaScript.







export type PublicUser = {
  id: number;
  username: string;
  avatarUrl: string | null;
  createdAt: string;
};


export async function getUsers(): Promise<PublicUser[]> {
  const response = await fetch('/api/users');

  if (!response.ok) {
    throw new Error('Users unavailable');
  }

  return response.json();
}







export const DEFAULT_AVATAR_URL = '/default-avatar.svg';

export type User = {
  id: number;
  username: string;
  email: string;
  avatarUrl: string | null;
  createdAt?: string;
  updatedAt?: string;
};


export type RegisterData = {
  username: string;
  email: string;
  password: string;
};

export type LoginData = {
  email: string;
  password: string;
};

export type LoginResponse = {
  accessToken: string;
  user: User;
};

async function parseError(response: Response): Promise<string> {
  const data = await response.json().catch(() => null);

  if (Array.isArray(data?.message)) {
    return data.message.join(', ');
  }

  return data?.message ?? 'An unexpected error occurred';
}

export async function register(
  registerData: RegisterData,
): Promise<User> {
  const response = await fetch('/api/auth/register', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(registerData),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return response.json();
}

export async function login(
  loginData: LoginData,
): Promise<LoginResponse> {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(loginData),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return response.json();
}

export async function getMe(accessToken: string): Promise<User> {
  const response = await fetch('/api/auth/me', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return response.json();
}








export type UpdateProfileData = {
  username: string;
};


export async function updateMe(
  accessToken: string,
  updateProfileData: UpdateProfileData,
): Promise<User> {
  const response = await fetch('/api/auth/me', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(updateProfileData),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return response.json();
}






export async function uploadAvatar(
  accessToken: string,
  avatar: File,
): Promise<User> {
  const formData = new FormData();

  formData.append('avatar', avatar);

  const response = await fetch('/api/auth/me/avatar', {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: formData,
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return response.json();
}







export type FriendListItem = {
  id: number;
  friend: PublicUser;
  createdAt: string;
  updatedAt: string;
};

export type FriendRequestItem = {
  id: number;
  requester: PublicUser;
  createdAt: string;
};

function getAccessToken() {
  return localStorage.getItem('accessToken');
}

async function requestWithAuth<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const accessToken = getAccessToken();

  const response = await fetch(`/api${path}`, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    const message =
      errorBody?.message ?? `Request failed with status ${response.status}`;

    throw new Error(Array.isArray(message) ? message.join(', ') : message);
  }

  return response.json() as Promise<T>;
}

export async function getFriends() {
  return requestWithAuth<FriendListItem[]>('/friends');
}

export async function getFriendRequests() {
  return requestWithAuth<FriendRequestItem[]>('/friends/requests');
}

export async function sendFriendRequest(userId: number) {
  return requestWithAuth(`/friends/${userId}`, {
    method: 'POST',
  });
}

export async function acceptFriendRequest(userId: number) {
  return requestWithAuth(`/friends/${userId}/accept`, {
    method: 'PATCH',
  });
}

export async function removeFriend(userId: number) {
  return requestWithAuth(`/friends/${userId}`, {
    method: 'DELETE',
  });
}




// correction du probleme :
// J’ai déjà envoyé une demande à julien
// -> ne pas l’afficher dans 'Find users'

export type SentFriendRequestItem = {
  id: number;
  receiver: PublicUser;
  createdAt: string;
};

export async function getSentFriendRequests() {
  return requestWithAuth<SentFriendRequestItem[]>('/friends/sent-requests');
}