import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../../utils/test-utils';
import { ModelViewer } from './ModelViewer';
import { mockThreeJS } from '../../utils/test-utils';

// Mock Three.js
const { mockScene, mockCamera, mockRenderer, mockGLTF } = mockThreeJS();

vi.mock('@react-three/fiber', () => ({
	Canvas: ({ children }: { children: React.ReactNode }) => <div data-testid="canvas">{children}</div>,
	useThree: () => ({
		scene: mockScene,
		camera: mockCamera,
		gl: mockRenderer
	})
}));

vi.mock('@react-three/drei', () => ({
	OrbitControls: () => null,
	PerspectiveCamera: () => null,
	useGLTF: vi.fn(() => mockGLTF)
}));

describe('ModelViewer Component', () => {
	it('renders without crashing', () => {
		render(<ModelViewer />);
		expect(screen.getByTestId('canvas')).toBeInTheDocument();
	});

	it('handles model URL prop', () => {
		render(<ModelViewer modelUrl="https://example.com/model.glb" />);
		expect(screen.getByTestId('canvas')).toBeInTheDocument();
	});

	// Add more test cases as needed
}); 