import { BrowserRouter, Routes, Route } from 'react-router-dom';

import Home from '../pages/Home';
import Login from '../pages/Login';
import Register from '../pages/Register';
import Profile from '../pages/Profile';
import { Friends } from '../pages/Friends';

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />

        <Route path="/login" element={<Login />} />

        <Route path="/register" element={<Register />} />

        <Route path="/profile" element={<Profile />} />

        <Route path="/friends" element={<Friends />} />
      </Routes>
    </BrowserRouter>
  );
}



// import { BrowserRouter, Routes, Route } from 'react-router-dom';
// -> On importe les trois outils principaux de React Router.

// import Home from '../pages/Home';
// On importe la page Home. Pareil pour les autres. c'est comme un include

// export default function AppRouter()
// Comme pour App.tsx, c'est simplement un composant React.

//<BrowserRouter>
// C'est lui qui active le système de navigation.

// Sans lui :
// /login
// /profile
// /register

// ne fonctionneraient pas.
// On ne le met qu'une seule fois dans toute l'application.

//<Routes>
// Il contient toutes les routes.
// On peut presque le lire comme :
// "Voici la liste des pages de mon site."


//<Route
// path="/"
// element={<Home />}
// />

// Si l'URL est "/" -> Afficher <Home />

// Même logique :

//<Route
//     path="/login"
//     element={<Login />}
// />