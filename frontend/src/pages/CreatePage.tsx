import { useParams, Navigate } from 'react-router-dom';
import { getPrintType } from '../data/printTypes';
import { Generate } from './Generate';

export function CreatePage() {
  const { printType: slug } = useParams<{ printType: string }>();
  const printType = slug ? getPrintType(slug) : undefined;

  if (slug && !printType) {
    return <Navigate to="/generate" replace />;
  }

  return <Generate printType={printType} />;
}
