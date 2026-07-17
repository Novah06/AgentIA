import type { Metadata } from 'next';
import { StudioShell } from '@/components/studio/StudioShell';

export const metadata: Metadata = {
  title: 'Metria — Avant-chiffrage assisté par IA',
  description:
    "À partir d'un brief, de plans et de rendus 3D : prestations à prévoir, questions manquantes, risques et préchiffrage.",
};

export default function StudioLayout({ children }: { children: React.ReactNode }) {
  return <StudioShell>{children}</StudioShell>;
}
