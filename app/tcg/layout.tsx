import type { Metadata } from 'next';
import TcgShell from '@/components/tcg/TcgShell';

export const metadata: Metadata = {
  title: 'Portefeuille Pokémon — collection, coffre-fort et cotes',
  description:
    'Suivi de collection Pokémon en français : cartes loose, cartes gradées et produits scellés, cotes en euros actualisées deux fois par jour et courbe de valeur du coffre-fort.',
};

export default function TcgLayout({ children }: { children: React.ReactNode }) {
  return <TcgShell>{children}</TcgShell>;
}
