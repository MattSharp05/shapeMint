#!/usr/bin/env node

/**
 * Background script to process existing models without thumbnails
 * Run this script to generate thumbnails for all existing models
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function processExistingModels() {
  console.log('🔍 Finding models without thumbnails...');
  
  try {
    // Find all completed models without thumbnails
    const { data: models, error } = await supabase
      .from('generated_models')
      .select('id, glb_url, name, thumbnail_status')
      .eq('status', 'completed')
      .or('thumbnail_status.is.null,thumbnail_status.eq.pending')
      .not('glb_url', 'is', null)
      .order('created_at', { ascending: false });
    
    if (error) {
      throw new Error(`Failed to fetch models: ${error.message}`);
    }
    
    if (!models || models.length === 0) {
      console.log('✅ No models need thumbnail processing');
      return;
    }
    
    console.log(`📋 Found ${models.length} models needing thumbnails`);
    
    // Process in batches of 10
    const batchSize = 10;
    let processed = 0;
    let errors = 0;
    
    for (let i = 0; i < models.length; i += batchSize) {
      const batch = models.slice(i, i + batchSize);
      console.log(`\n🔄 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(models.length / batchSize)}`);
      
      for (const model of batch) {
        try {
          console.log(`  📝 Processing model: ${model.name || model.id}`);
          
          // Add to processing queue
          const { error: queueError } = await supabase
            .from('thumbnail_processing_queue')
            .insert({
              model_id: model.id,
              priority: 0, // Lower priority for existing models
              status: 'pending'
            });
          
          if (queueError) {
            console.error(`    ❌ Failed to queue model ${model.id}:`, queueError.message);
            errors++;
            continue;
          }
          
          console.log(`    ✅ Queued model ${model.id}`);
          processed++;
          
          // Small delay to avoid overwhelming the system
          await new Promise(resolve => setTimeout(resolve, 100));
          
        } catch (error) {
          console.error(`    ❌ Error processing model ${model.id}:`, error.message);
          errors++;
        }
      }
      
      // Delay between batches
      if (i + batchSize < models.length) {
        console.log('  ⏳ Waiting 2 seconds before next batch...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    console.log(`\n✅ Processing complete!`);
    console.log(`   Processed: ${processed}`);
    console.log(`   Errors: ${errors}`);
    console.log(`   Total: ${models.length}`);
    
    if (processed > 0) {
      console.log('\n📋 Next steps:');
      console.log('   1. Deploy the Edge Functions to Supabase');
      console.log('   2. Run the process-thumbnail-queue function');
      console.log('   3. Monitor progress in the Supabase dashboard');
    }
    
  } catch (error) {
    console.error('❌ Error processing models:', error.message);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  processExistingModels()
    .then(() => {
      console.log('\n🎉 Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Script failed:', error.message);
      process.exit(1);
    });
}

module.exports = { processExistingModels }; 