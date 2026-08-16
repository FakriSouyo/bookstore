import { GuideClient } from '@/components/guide/GuideClient';
import { PageHeader } from '@/components/shared/PageHeader';

export default function GuidePage() {
  return (
    <div>
      <PageHeader
        title="Panduan"
        subtitle="Cara kerja stok & tutorial semua fitur — tonton langkah demi langkah"
      />
      <GuideClient />
    </div>
  );
}
