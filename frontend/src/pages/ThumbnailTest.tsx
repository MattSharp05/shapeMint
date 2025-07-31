import { ThumbnailDemo } from '../components/UI/ThumbnailDemo';

export function ThumbnailTest() {
  return (
    <div className="pt-16 min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Thumbnail Generator Test
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Test the client-side thumbnail generation with any GLB model URL
          </p>
        </div>

        <ThumbnailDemo />
      </div>
    </div>
  );
}
