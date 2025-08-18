import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '../../utils/test-utils'
import userEvent from '@testing-library/user-event'
import { GenerationForm } from './GenerationForm'
import { createTestFile } from '../../utils/test-data'

// Mock useModelGeneration hook
const mockUseModelGeneration = {
  generating: false,
  progress: 0,
  status: 'pending' as const,
  generatedModel: null as string | null,
  generationData: null as any,
  error: null as string | null,
  generateModel: vi.fn(),
  reset: vi.fn()
}

vi.mock('../../hooks/useModelGeneration', () => ({
  useModelGeneration: () => mockUseModelGeneration
}))

// Mock meshyService
vi.mock('../../services/meshy', () => ({
  meshyService: {
    generateAndStoreModel: vi.fn(),
    generateAndStoreModelFromImage: vi.fn()
  }
}))

describe('GenerationForm', () => {
  const mockOnSuccess = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    // Reset mock state
    Object.assign(mockUseModelGeneration, {
      generating: false,
      progress: 0,
      status: 'pending',
      generatedModel: null,
      generationData: null,
      error: null
    })
  })

  it('renders text mode by default', () => {
    render(<GenerationForm onSuccess={mockOnSuccess} />)

    expect(screen.getByText(/Generate 3D Model/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/describe your 3d model/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /generate model/i })).toBeInTheDocument()
  })

  describe('initial render', () => {
    it('renders text mode by default', () => {
      render(<GenerationForm onSuccess={mockOnSuccess} />)

      expect(screen.getByText('Generate 3D Model')).toBeInTheDocument()
      expect(screen.getByPlaceholderText(/describe your 3d model/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /generate model/i })).toBeInTheDocument()
    })

    it('renders mode toggle buttons', () => {
      render(<GenerationForm onSuccess={mockOnSuccess} />)

      expect(screen.getByRole('button', { name: /text/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /image/i })).toBeInTheDocument()
    })

    it('shows text mode as active initially', () => {
      render(<GenerationForm onSuccess={mockOnSuccess} />)

      const textButton = screen.getByRole('button', { name: /text/i })
      expect(textButton).toHaveClass('bg-purple-600') // Active state
    })
  })

  describe('text mode', () => {
    it('allows user to type in prompt field', async () => {
      const user = userEvent.setup()
      render(<GenerationForm onSuccess={mockOnSuccess} />)

      const promptInput = screen.getByPlaceholderText(/describe your 3d model/i)
      await user.type(promptInput, 'A futuristic car')

      expect(promptInput).toHaveValue('A futuristic car')
    })

    it('allows style selection', async () => {
      const user = userEvent.setup()
      render(<GenerationForm onSuccess={mockOnSuccess} />)

      const styleSelect = screen.getByLabelText(/style/i)
      await user.selectOptions(styleSelect, 'realistic')

      expect(styleSelect).toHaveValue('realistic')
    })

    it('submits form with text prompt', async () => {
      const user = userEvent.setup()
      mockUseModelGeneration.generateModel.mockResolvedValue('model-123')

      render(<GenerationForm onSuccess={mockOnSuccess} />)

      const promptInput = screen.getByPlaceholderText(/describe your 3d model/i)
      const generateButton = screen.getByRole('button', { name: /generate model/i })

      await user.type(promptInput, 'A spaceship')
      await user.click(generateButton)

      expect(mockUseModelGeneration.generateModel).toHaveBeenCalledWith({
        prompt: 'A spaceship',
        image: undefined
      })
    })

    it('validates prompt is not empty', async () => {
      const user = userEvent.setup()
      render(<GenerationForm onSuccess={mockOnSuccess} />)

      const generateButton = screen.getByRole('button', { name: /generate model/i })
      await user.click(generateButton)

      expect(mockUseModelGeneration.generateModel).not.toHaveBeenCalled()
      expect(screen.getByText(/prompt is required/i)).toBeInTheDocument()
    })

    it('disables form during generation', async () => {
      mockUseModelGeneration.generating = true
      
      render(<GenerationForm onSuccess={mockOnSuccess} />)

      const promptInput = screen.getByPlaceholderText(/describe your 3d model/i)
      const generateButton = screen.getByRole('button', { name: /generating/i })

      expect(promptInput).toBeDisabled()
      expect(generateButton).toBeDisabled()
    })
  })

  describe('image mode', () => {
    beforeEach(async () => {
      const user = userEvent.setup()
      render(<GenerationForm onSuccess={mockOnSuccess} />)
      
      const imageButton = screen.getByRole('button', { name: /image/i })
      await user.click(imageButton)
    })

    it('switches to image mode when image button clicked', async () => {
      expect(screen.getByText(/upload an image/i)).toBeInTheDocument()
      expect(screen.getByText(/drag.*drop.*image/i)).toBeInTheDocument()
    })

    it('shows image upload area', () => {
      const uploadArea = screen.getByText(/drag.*drop.*image/i).closest('div')
      expect(uploadArea).toBeInTheDocument()
    })

    it('handles file upload via input', async () => {
      const user = userEvent.setup()
      const testFile = createTestFile('test.jpg', 'image/jpeg')

      const fileInput = screen.getByLabelText(/upload image/i)
      await user.upload(fileInput, testFile)

      await waitFor(() => {
        expect(screen.getByText('test.jpg')).toBeInTheDocument()
      })
    })

    it('validates image file type', async () => {
      const user = userEvent.setup()
      const invalidFile = createTestFile('document.pdf', 'application/pdf')

      const fileInput = screen.getByLabelText(/upload image/i)
      await user.upload(fileInput, invalidFile)

      await waitFor(() => {
        expect(screen.getByText(/please select a valid image file/i)).toBeInTheDocument()
      })
    })

    it('handles drag and drop upload', async () => {
      const testFile = createTestFile('dropped.jpg', 'image/jpeg')
      const uploadArea = screen.getByText(/drag.*drop.*image/i).closest('div')

      fireEvent.dragOver(uploadArea!)
      fireEvent.drop(uploadArea!, {
        dataTransfer: {
          files: [testFile]
        }
      })

      await waitFor(() => {
        expect(screen.getByText('dropped.jpg')).toBeInTheDocument()
      })
    })

    it('submits form with image', async () => {
      const user = userEvent.setup()
      const testFile = createTestFile('test.jpg', 'image/jpeg')
      mockUseModelGeneration.generateModel.mockResolvedValue('model-123')

      const fileInput = screen.getByLabelText(/upload image/i)
      await user.upload(fileInput, testFile)

      await waitFor(() => {
        expect(screen.getByText('test.jpg')).toBeInTheDocument()
      })

      const generateButton = screen.getByRole('button', { name: /generate model/i })
      await user.click(generateButton)

      expect(mockUseModelGeneration.generateModel).toHaveBeenCalledWith({
        prompt: '',
        image: testFile
      })
    })

    it('validates image is selected', async () => {
      const user = userEvent.setup()
      
      const generateButton = screen.getByRole('button', { name: /generate model/i })
      await user.click(generateButton)

      expect(mockUseModelGeneration.generateModel).not.toHaveBeenCalled()
      expect(screen.getByText(/please select an image/i)).toBeInTheDocument()
    })

    it('allows removing uploaded image', async () => {
      const user = userEvent.setup()
      const testFile = createTestFile('test.jpg', 'image/jpeg')

      const fileInput = screen.getByLabelText(/upload image/i)
      await user.upload(fileInput, testFile)

      await waitFor(() => {
        expect(screen.getByText('test.jpg')).toBeInTheDocument()
      })

      const removeButton = screen.getByRole('button', { name: /remove/i })
      await user.click(removeButton)

      expect(screen.queryByText('test.jpg')).not.toBeInTheDocument()
      expect(screen.getByText(/drag.*drop.*image/i)).toBeInTheDocument()
    })
  })

  describe('prefilled data', () => {
    it('fills form with prefilled prompt', () => {
      const prefilledData = {
        prefilledPrompt: 'A robot dog',
        socialTag: 'robot',
        mode: 'text' as const
      }

      render(<GenerationForm onSuccess={mockOnSuccess} prefilledData={prefilledData} />)

      const promptInput = screen.getByPlaceholderText(/describe your 3d model/i)
      expect(promptInput).toHaveValue('A robot dog')
    })

    it('switches to image mode with prefilled image', () => {
      const prefilledData = {
        mode: 'image' as const,
        image: createTestFile('prefilled.jpg', 'image/jpeg')
      }

      render(<GenerationForm onSuccess={mockOnSuccess} prefilledData={prefilledData} />)

      expect(screen.getByText(/upload an image/i)).toBeInTheDocument()
      expect(screen.getByText('prefilled.jpg')).toBeInTheDocument()
    })

    it('displays social tag when provided', () => {
      const prefilledData = {
        socialTag: 'trending',
        prefilledPrompt: 'Popular model'
      }

      render(<GenerationForm onSuccess={mockOnSuccess} prefilledData={prefilledData} />)

      expect(screen.getByText(/trending/i)).toBeInTheDocument()
    })
  })

  describe('generation states', () => {
    it('shows progress during generation', () => {
      Object.assign(mockUseModelGeneration, {
        generating: true,
        progress: 45,
        status: 'generating'
      })

      render(<GenerationForm onSuccess={mockOnSuccess} />)

      expect(screen.getByText(/generating/i)).toBeInTheDocument()
      expect(screen.getByText('45%')).toBeInTheDocument()
    })

    it('shows error message on generation failure', () => {
      Object.assign(mockUseModelGeneration, {
        error: 'Generation failed',
        status: 'failed'
      })

      render(<GenerationForm onSuccess={mockOnSuccess} />)

      expect(screen.getByText('Generation failed')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument()
    })

    it('calls onSuccess when generation completes', async () => {
      const generationData = {
        id: 'model-123',
        name: 'Generated Model',
        glb_url: 'https://example.com/model.glb'
      };

      Object.assign(mockUseModelGeneration, {
        status: 'completed',
        generatedModel: 'model-123',
        generationData
      });

      render(<GenerationForm onSuccess={mockOnSuccess} />)

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalledWith(generationData);
      })
    })

    it('allows retry after failure', async () => {
      const user = userEvent.setup()
      Object.assign(mockUseModelGeneration, {
        error: 'Generation failed',
        status: 'failed'
      })

      render(<GenerationForm onSuccess={mockOnSuccess} />)

      const retryButton = screen.getByRole('button', { name: /try again/i })
      await user.click(retryButton)

      expect(mockUseModelGeneration.reset).toHaveBeenCalled()
    })
  })

  describe('loading states', () => {
    it('shows initial loading when loading prop is true', () => {
      render(<GenerationForm onSuccess={mockOnSuccess} loading={true} />)

      expect(screen.getByText(/loading/i)).toBeInTheDocument()
    })

    it('disables form when loading', () => {
      render(<GenerationForm onSuccess={mockOnSuccess} loading={true} />)

      const promptInput = screen.getByPlaceholderText(/describe your 3d model/i)
      const generateButton = screen.getByRole('button')

      expect(promptInput).toBeDisabled()
      expect(generateButton).toBeDisabled()
    })
  })

  describe('form validation', () => {
    it('validates prompt length', async () => {
      const user = userEvent.setup()
      render(<GenerationForm onSuccess={mockOnSuccess} />)

      const promptInput = screen.getByPlaceholderText(/describe your 3d model/i)
      const longPrompt = 'a'.repeat(501) // Assuming max length is 500

      await user.type(promptInput, longPrompt)

      const generateButton = screen.getByRole('button', { name: /generate model/i })
      await user.click(generateButton)

      expect(screen.getByText(/prompt is too long/i)).toBeInTheDocument()
    })

    it('validates image file size', async () => {
      const user = userEvent.setup()
      render(<GenerationForm onSuccess={mockOnSuccess} />)

      // Switch to image mode
      const imageButton = screen.getByRole('button', { name: /image/i })
      await user.click(imageButton)

      const largeFile = createTestFile('large.jpg', 'image/jpeg', 'content', 10 * 1024 * 1024) // 10MB
      const fileInput = screen.getByLabelText(/upload image/i)
      
      await user.upload(fileInput, largeFile)

      await waitFor(() => {
        expect(screen.getByText(/file size too large/i)).toBeInTheDocument()
      })
    })

    it('clears validation errors when input changes', async () => {
      const user = userEvent.setup()
      render(<GenerationForm onSuccess={mockOnSuccess} />)

      // Trigger validation error
      const generateButton = screen.getByRole('button', { name: /generate model/i })
      await user.click(generateButton)

      expect(screen.getByText(/prompt is required/i)).toBeInTheDocument()

      // Clear error by typing
      const promptInput = screen.getByPlaceholderText(/describe your 3d model/i)
      await user.type(promptInput, 'A')

      expect(screen.queryByText(/prompt is required/i)).not.toBeInTheDocument()
    })
  })

  describe('accessibility', () => {
    it('has proper ARIA labels', () => {
      render(<GenerationForm onSuccess={mockOnSuccess} />)

      expect(screen.getByLabelText(/model prompt/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/style/i)).toBeInTheDocument()
      expect(screen.getByRole('group', { name: /generation mode/i })).toBeInTheDocument()
    })

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup()
      render(<GenerationForm onSuccess={mockOnSuccess} />)

      const promptInput = screen.getByPlaceholderText(/describe your 3d model/i)
      const textButton = screen.getByRole('button', { name: /text/i })
      const imageButton = screen.getByRole('button', { name: /image/i })

      // Tab through elements
      await user.tab()
      expect(promptInput).toHaveFocus()

      await user.tab()
      expect(textButton).toHaveFocus()

      await user.tab()
      expect(imageButton).toHaveFocus()
    })

    it('announces generation status to screen readers', () => {
      Object.assign(mockUseModelGeneration, {
        generating: true,
        status: 'generating'
      })

      render(<GenerationForm onSuccess={mockOnSuccess} />)

      const statusElement = screen.getByRole('status')
      expect(statusElement).toHaveTextContent(/generating/i)
    })
  })

  describe('edge cases', () => {
    it('handles missing onSuccess callback gracefully', async () => {
      const user = userEvent.setup()
      mockUseModelGeneration.generateModel.mockResolvedValue('model-123')

      render(<GenerationForm />)

      const promptInput = screen.getByPlaceholderText(/describe your 3d model/i)
      const generateButton = screen.getByRole('button', { name: /generate model/i })

      await user.type(promptInput, 'Test prompt')
      await user.click(generateButton)

      // Should not throw error
      expect(mockUseModelGeneration.generateModel).toHaveBeenCalled()
    })

    it('handles component unmount during generation', () => {
      Object.assign(mockUseModelGeneration, {
        generating: true
      })

      const { unmount } = render(<GenerationForm onSuccess={mockOnSuccess} />)

      // Should not throw error when unmounting during generation
      expect(() => unmount()).not.toThrow()
    })

    it('resets form after successful generation', async () => {
      const user = userEvent.setup()
      const generationData = { id: 'model-123', name: 'Generated Model', glb_url: 'https://example.com/model.glb' }

      Object.assign(mockUseModelGeneration, {
        status: 'completed',
        generationData
      })

      render(<GenerationForm onSuccess={mockOnSuccess} />)

      // Form should be reset after successful generation
      await waitFor(() => {
        const promptInput = screen.getByPlaceholderText(/describe your 3d model/i)
        expect(promptInput).toHaveValue('')
      })
    })
  })
}) 