import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing required environment variables');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixProcessingModels() {
  console.log('🔍 Checking for models stuck in processing state...');
  
  // Get all models that are stuck in processing state
  const { data: processingModels, error } = await supabase
    .from('generated_models')
    .select('*')
    .eq('status', 'processing');

  if (error) {
    console.error('❌ Error fetching processing models:', error);
    return;
  }

  console.log(`📊 Found ${processingModels.length} models in processing state`);
  
  let fixedCount = 0;
  
  for (const model of processingModels) {
    try {
      console.log(`\n🔍 Checking model ${model.id}...`);
      
      // Check if model has valid URLs but is still marked as processing
      if (model.glb_url || model.obj_url) {
        console.log(`✅ Found valid URLs for model ${model.id}:`);
        console.log(`   - GLB: ${model.glb_url || 'Not available'}`);
        console.log(`   - OBJ: ${model.obj_url || 'Not available'}`);
        
        // Update the model status to completed
        const { error: updateError } = await supabase
          .from('generated_models')
          .update({
            status: 'completed',
            updated_at: new Date().toISOString(),
            notes: 'Auto-completed during system recovery. ' + (model.notes || '')
          })
          .eq('id', model.id);
          
        if (updateError) {
          console.error(`❌ Failed to update model ${model.id}:`, updateError);
        } else {
          console.log(`✅ Successfully marked model ${model.id} as completed`);
          fixedCount++;
        }
      } else {
        console.log(`ℹ️ Model ${model.id} has no valid URLs, marking as failed`);
        
        // Mark as failed if no valid URLs
        await supabase
          .from('generated_models')
          .update({
            status: 'failed',
            updated_at: new Date().toISOString(),
            notes: 'Marked as failed during system recovery - no valid model URLs found. ' + (model.notes || '')
          })
          .eq('id', model.id);
      }
    } catch (err) {
      console.error(`⚠️ Error processing model ${model.id}:`, err);
    }
  }
  
  console.log(`\n✨ Process completed! Fixed ${fixedCount} out of ${processingModels.length} processing models.`);
}

// Run the script
fixProcessingModels().catch(console.error);
