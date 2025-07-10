import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export const useSlant3DFilaments = () => {
  return useQuery({
    queryKey: ['slant3d-filaments'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('slant3d-filaments')
      if (error) throw error
      return data
    },
    staleTime: 3600000 // 1 hour
  })
}

export const useSlant3DSlicer = () => {
  return useMutation({
    mutationFn: async (fileURL: string) => {
      const { data, error } = await supabase.functions.invoke('slant3d-slicer', {
        body: { fileURL }
      })
      if (error) throw error
      return data
    }
  })
}

export const useSlant3DQuote = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (orderData: any) => {
      const { data, error } = await supabase.functions.invoke('slant3d-quote', {
        body: { orderData }
      })
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['slant3d-quotes'] })
    }
  })
} 