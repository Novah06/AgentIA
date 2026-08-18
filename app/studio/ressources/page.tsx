import { redirect } from 'next/navigation';

/** Les ressources IA ont rejoint la page « Notre entreprise ». */
export default function RessourcesRedirect() {
  redirect('/studio/profil');
}
