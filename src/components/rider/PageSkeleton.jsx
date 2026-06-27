import BodaSureLoader from '@/components/BodaSureLoader';

export default function PageSkeleton({ variant = 'default' }) {
  return <BodaSureLoader size="md" showWordmark={false} />;
}