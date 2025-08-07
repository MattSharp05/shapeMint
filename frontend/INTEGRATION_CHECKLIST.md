# ComfyUI Integration Verification Checklist

## 🔧 **Implementation Summary**
- ✅ Created `comfyUIService.ts` with production polling logic
- ✅ Created `generate-3d-model-v2` edge function with routing logic
- ✅ Updated `modelService.ts` to route Image-to-3D → ComfyUI, Text-to-3D → MeshyAI
- ✅ Updated `GenerationForm.tsx` to use unified `modelService`
- ✅ Updated `Generate.tsx` to handle new response structure
- ✅ Preserved ComfyUI test page functionality

## 📋 **Testing Checklist**

### **Text-to-3D (MeshyAI) - Should Work Unchanged**
- [ ] Navigate to `/generate`
- [ ] Enter text prompt only (no image)
- [ ] Click "Generate 3D Model"
- [ ] Verify console shows: `🔀 Routing to MeshyAI (Text-to-3D)`
- [ ] Verify generation completes successfully
- [ ] Verify model displays in viewer
- [ ] Verify download URLs are available

### **Image-to-3D (ComfyUI) - New Workflow**
- [ ] Navigate to `/generate`
- [ ] Select "Upload Image" mode
- [ ] Upload an image file
- [ ] Add optional text prompt
- [ ] Click "Generate 3D Model"
- [ ] Verify console shows: `🔀 Routing to ComfyUI (Image-to-3D)`
- [ ] Verify polling starts (progress updates every 5 seconds)
- [ ] Verify generation completes (may take 5-15 minutes)
- [ ] Verify model displays in viewer
- [ ] Verify download URLs are available

### **Edge Function Routing**
- [ ] Check browser network tab during Image-to-3D
- [ ] Verify calls to `/functions/v1/generate-3d-model-v2`
- [ ] Verify calls to `/functions/v1/start-comfyui-job`
- [ ] Verify calls to `/functions/v1/poll-comfyui-job`

### **ComfyUI Test Page - Should Work Unchanged**
- [ ] Navigate to `/test-comfyui`
- [ ] Verify test page still works independently
- [ ] Upload image and run test
- [ ] Verify test workflow completes successfully

## 🔍 **Debug Information**

### **Console Logs to Check**
- `🔀 Routing to ComfyUI (Image-to-3D)` or `🔀 Routing to MeshyAI (Text-to-3D)`
- `🖼️ Starting ComfyUI Image-to-3D generation` or `📝 Starting MeshyAI Text-to-3D generation`
- `🚀 Starting ComfyUI generation...`
- `🔄 Starting polling for job: {jobId}`
- `✅ ComfyUI generation completed!`
- `Generation type: comfyui` or `Generation type: meshy`

### **Expected Response Structure**

**ComfyUI Response:**
```json
{
  "type": "comfyui",
  "urls": {
    "glb": "https://supabase-url/storage/.../model.glb"
  },
  "taskId": "job-uuid",
  "modelDetails": { ... }
}
```

**MeshyAI Response:**
```json
{
  "type": "meshy", 
  "urls": {
    "glb": "https://supabase-url/storage/.../model.glb",
    "obj": "...",
    "stl": "..."
  },
  "taskId": "meshy-task-id"
}
```

## 🚨 **Troubleshooting**

### **Common Issues**
1. **Image-to-3D fails immediately**: Check ComfyUI server accessibility
2. **Polling timeout**: ComfyUI generation can take 5-15 minutes
3. **Model not displaying**: Check GLB URL in browser console
4. **Edge function timeout**: Should not happen with new polling approach

### **Rollback Plan**
If issues occur:
1. Change `modelService.ts` to use `generate-3d-model` instead of `generate-3d-model-v2`
2. Revert `GenerationForm.tsx` to use `meshyService.generateAndStoreModel`
3. All functionality returns to previous MeshyAI-only state

## ✅ **Success Criteria**
- [ ] Text-to-3D continues working with MeshyAI
- [ ] Image-to-3D now works with ComfyUI
- [ ] No regressions in existing functionality
- [ ] ComfyUI test page remains functional
- [ ] Console logs show correct routing decisions
- [ ] Generated models display properly in UI
- [ ] Download functionality works for both workflows

---

**Next Steps After Testing:**
1. If successful → Remove old `generate-3d-model` edge function
2. If successful → Eventually remove ComfyUI test page (optional)
3. If issues → Use rollback plan and debug incrementally 