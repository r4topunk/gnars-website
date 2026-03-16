export interface Installation {
  id: string;
  slug: string;
  title: string;
  location: {
    city: string;
    country: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
  obstacleDesign: string;
  collective: string;
  proposalUrl?: string;
  activation?: string;
  media: {
    type: 'youtube' | 'instagram' | 'website' | 'image';
    url: string;
    label?: string;
  }[];
  coverImage?: string;
  description?: string;
  year?: number;
  status?: 'active' | 'archived';
}

export interface InstallationsData {
  installations: Installation[];
  meta: {
    total: number;
    lastUpdated: string;
  };
}
