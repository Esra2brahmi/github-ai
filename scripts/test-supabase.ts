import { supabase } from '../src/lib/supabase';
import fs from 'fs/promises';
import path from 'path';

async function testSupabase() {
  console.log('Testing Supabase connection...');
  
  // Test connection
  try {
    const { data, error } = await supabase.from('test_table').select('*').limit(1);
    if (error) {
      console.log('Supabase connection test failed:', error.message);
    } else {
      console.log('✅ Supabase connection successful!');
    }
  } catch (error) {
    console.error('Error testing Supabase connection:', error);
  }

  // Test file upload
  try {
    console.log('\nTesting file upload...');
    const testFilePath = path.join(process.cwd(), 'public', 'github-svgrepo-com.svg');
    const file = await fs.readFile(testFilePath);
    const blob = new Blob([file]);
    const testFile = new File([blob], 'test-upload.svg', { type: 'image/svg+xml' });

    console.log('Uploading test file...');
    const publicUrl = await supabase.storage
      .from('meetings')
      .upload(`test-${Date.now()}.svg`, testFile, {
        cacheControl: '3600',
        upsert: false,
      });

    if (publicUrl.error) {
      console.error('❌ File upload failed:', publicUrl.error);
    } else {
      console.log('✅ File upload successful!');
      console.log('File path:', publicUrl.data.path);
      
      // Test file URL generation
      const { data: { publicUrl: fileUrl } } = supabase.storage
        .from('meetings')
        .getPublicUrl(publicUrl.data.path);
      
      console.log('Public URL:', fileUrl);
    }
  } catch (error) {
    console.error('Error testing file upload:', error);
  }
}

testSupabase().catch(console.error);
