import { NextRequest, NextResponse } from 'next/server';
import { supabase, usingServiceRole } from '../_supabase';

export const runtime = 'nodejs';

const errorResponse = (message: string, status = 500) => {
  return NextResponse.json({ error: message }, { status });
};

const uploadImages = async (files: File[], folderPrefix: string) => {
  if (!supabase) {
    throw new Error('Supabase client is not initialized');
  }

  const uploadedUrls: string[] = [];

  for (const file of files) {
    const fileExt = file.name.split('.').pop();
    const fileName = `${folderPrefix}/${crypto.randomUUID()}.${fileExt}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await supabase
      .storage
      .from('ERP')
      .upload(fileName, buffer, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type
      });

    if (uploadError) {
      throw new Error(`Lỗi upload ảnh "${file.name}": ${uploadError.message}`);
    }

    const { data: urlData } = supabase.storage
      .from('ERP')
      .getPublicUrl(fileName);

    if (urlData?.publicUrl) {
      uploadedUrls.push(urlData.publicUrl);
    }
  }

  return uploadedUrls;
};

export async function POST(request: NextRequest) {
  try {
    if (!supabase) {
      return errorResponse('Supabase URL hoặc key chưa được cấu hình.');
    }
    if (!usingServiceRole) {
      console.warn('⚠️ SUPABASE_SERVICE_ROLE_KEY not found. Using anon key - RLS policies must allow INSERT.');
    }

    const formData = await request.formData();
    const dataField = formData.get('data');
    if (!dataField || typeof dataField !== 'string') {
      return errorResponse('Thiếu dữ liệu xe', 400);
    }

    const vehicleData = JSON.parse(dataField);
    const vin = (vehicleData?.vin || '').toUpperCase();

    if (!vin) {
      return errorResponse('Thiếu số VIN', 400);
    }

    const { data: existingVehicle, error: checkError } = await supabase
      .from('vehicles')
      .select('id')
      .eq('vin', vin)
      .single();

    if (existingVehicle) {
      return errorResponse(`Số VIN "${vin}" đã tồn tại trong hệ thống.`, 400);
    }
    if (checkError && checkError.code !== 'PGRST116') {
      return errorResponse(checkError.message || 'Lỗi kiểm tra VIN');
    }

    const imageFiles = formData.getAll('images').filter((item): item is File => item instanceof File);
    const uploadedImageUrls = imageFiles.length > 0
      ? await uploadImages(imageFiles, `vehicle-${Date.now()}`)
      : [];

    const payload = {
      ...vehicleData,
      vin,
      images: uploadedImageUrls
    };

    const { data, error } = await supabase
      .from('vehicles')
      .insert([payload])
      .select()
      .single();

    if (error) {
      console.error('Error saving vehicle:', error);
      return errorResponse(error.message || 'Lỗi lưu dữ liệu xe');
    }

    return NextResponse.json({ vehicle: data });
  } catch (error: any) {
    console.error('Error in vehicles create API:', error);
    return errorResponse(error.message || 'Lỗi server khi tạo xe');
  }
}
