'use client'

import React, { useState, useEffect } from 'react';
import { SalesContract, Vehicle } from '@/types';
import { formatVND, formatDate, numberToWords, amountToWordsCapitalized } from '@/utils/format';

// Types for the new contract format
interface ContractData {
  contractNumber: string;
  date: string;
  seller: {
    name: string;
    address: string;
    taxId: string;
    account: string;
    bank: string;
    representative: string;
    position: string;
  };
  buyer: {
    name: string;
    address: string;
    phone: string;
    idCard: string;
    idDate: string;
    idPlace: string;
    email: string;
    taxCode?: string;
  };
  vehicle: {
    name: string;
    colorExt: string;
    colorInt: string;
    status: string;
    price: string;
    discount: string;
    finalPrice: string;
    quantity: number;
    total: string;
  };
}

interface ContractTemplateProps {
  contract: SalesContract;
  vehicle: Vehicle | null;
}

// Page component wrapper
const Page: React.FC<{ children: React.ReactNode; pageNumber: number }> = ({ children, pageNumber }) => (
  <div className="a4-page contract-text text-gray-900 text-[14px] text-justify selection:bg-blue-100 flex flex-col relative" style={{ lineHeight: '1.4' }}>
    <div className="flex-grow">{children}</div>
    <div className="absolute bottom-10 right-10 text-xs text-gray-400">Trang {pageNumber}</div>
  </div>
);

export const ContractTemplate: React.FC<ContractTemplateProps> = ({ contract, vehicle }) => {
  const [fullCustomerData, setFullCustomerData] = useState<any | null>(null);
  const [paymentSchedules, setPaymentSchedules] = useState<any[]>([]);

  // Hàm chia tên thành 2 dòng
  const splitNameIntoTwoLines = (name: string): [string, string] => {
    if (!name) return ['', ''];
    const words = name.trim().split(/\s+/);
    if (words.length === 1) {
      return [words[0], ''];
    }
    // Chia đôi: nửa đầu và nửa cuối
    const mid = Math.ceil(words.length / 2);
    const firstLine = words.slice(0, mid).join(' ');
    const secondLine = words.slice(mid).join(' ');
    return [firstLine, secondLine];
  };

  // Load full customer data from customers table
  useEffect(() => {
    const loadCustomerData = async () => {
      if (contract.customerPhone || contract.customerName) {
        const response = await fetch(`/api/contracts/customer?phone=${encodeURIComponent(contract.customerPhone || '')}&name=${encodeURIComponent(contract.customerName || '')}`, { cache: 'no-store' });
        const result = await response.json();
        if (response.ok && result?.customer) {
          setFullCustomerData(result.customer);
        }
      }
    };

    loadCustomerData();
  }, [contract.customerPhone, contract.customerName]);

  // Load payment schedules
  useEffect(() => {
    const loadPaymentSchedules = async () => {
      if (contract.id) {
        const response = await fetch(`/api/contracts/payment-schedules?contractId=${encodeURIComponent(contract.id)}`, { cache: 'no-store' });
        const result = await response.json();
        if (response.ok && result?.schedules) {
          setPaymentSchedules(result.schedules);
        }
      }
    };

    loadPaymentSchedules();
  }, [contract.id]);

  // Tính toán các số tiền thanh toán
  const depositAmount = paymentSchedules.length > 0 
    ? paymentSchedules[0]?.amount || 5000000 
    : 5000000; // Mặc định 5 triệu nếu không có schedule
  
  const loanAmount = contract.loanAmount || 0;
  const totalAmount = contract.totalAmount;
  const installmentAmount = totalAmount - depositAmount - loanAmount; // Số tiền đối ứng (Đợt 2)

  // Convert current contract data to new format
  const contractData: ContractData = {
    contractNumber: contract.contractCode,
    date: formatDate(contract.signedDate || new Date().toISOString().split('T')[0]),
    seller: {
      name: 'HỢP TÁC XÃ VẬN TẢI CẦN THƠ GF',
      address: 'Số 144, đường Trần Văn Trà, Phường Hưng Phú, Thành Phố Cần Thơ, Việt Nam',
      taxId: '1801807608',
      account: '26868686668',
      bank: 'TPBank - CN Cần Thơ',
      representative: 'Phan Phúc Hậu',
      position: 'Giám Đốc'
    },
    buyer: {
      name: fullCustomerData?.name || contract.customerName,
      address: fullCustomerData?.address || contract.customerAddress || '',
      phone: contract.customerPhone,
      idCard: fullCustomerData?.id_card || contract.customerIDCard || '',
      idDate: fullCustomerData?.id_card_issue_date ? formatDate(fullCustomerData.id_card_issue_date) : '',
      idPlace: fullCustomerData?.id_card_issue_place || '',
      email: fullCustomerData?.email || '',
      taxCode: fullCustomerData?.tax_code || ''
    },
    vehicle: {
      name: vehicle?.model || 'VinFast',
      colorExt: vehicle?.color || '',
      colorInt: 'VinFast cơ bản',
      status: 'Mới 100%',
      price: new Intl.NumberFormat('vi-VN').format(contract.carPrice + contract.vatAmount),
      discount: new Intl.NumberFormat('vi-VN').format(contract.discount || 0),
      finalPrice: new Intl.NumberFormat('vi-VN').format(contract.carPrice + contract.vatAmount - (contract.discount || 0)),
      quantity: 1,
      total: new Intl.NumberFormat('vi-VN').format(contract.carPrice + contract.vatAmount - (contract.discount || 0))
    }
  };

  return (
    <div className="flex flex-col items-center gap-8 print:block print:gap-0 contract-template">

      {/* ================= PAGE 1 ================= */}
      <Page pageNumber={1}>
        <div className="text-center mb-6">
          <h1 className="text-base font-bold uppercase mb-0">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</h1>
          <p className="font-bold underline text-sm mb-2">Độc lập - Tự do - Hạnh phúc</p>

          <h2 className="font-bold uppercase mt-4 text-blue-900" style={{ fontSize: '15px' }}>HỢP ĐỒNG MUA BÁN XE Ô TÔ ĐIỆN VINFAST</h2>
          <p className="font-bold mt-1">Số: {contractData.contractNumber}</p>
        </div>

        <p className="mb-3 italic">
          Hợp đồng mua bán xe Ô tô điện VinFast ("Hợp Đồng") này được ký ngày {contractData.date}, giữa:
        </p>

        {/* BEN A */}
        <div className="mb-4">
          <h3 className="font-bold uppercase text-blue-800 py-1 mb-1">BÊN A: {contractData.seller.name}</h3>
          <div className="space-y-1">
            <p><span className="font-bold">Địa chỉ trụ sở chính:</span> {contractData.seller.address}</p>
            <p><span className="font-bold">Mã số doanh nghiệp:</span> {contractData.seller.taxId}</p>
            <p><span className="font-bold">Tài khoản:</span> {contractData.seller.account} – <span className="font-bold">Ngân hàng:</span> {contractData.seller.bank}</p>
            <p><span className="font-bold">Đại diện:</span> {contractData.seller.representative}</p>
            <p><span className="font-bold">Chức vụ:</span> {contractData.seller.position}</p>
          </div>
          <p className="italic mt-1">(“Bên A” hoặc “Bên Bán”)</p>
        </div>

        {/* BEN B */}
        <div className="mb-4">
          <h3 className="font-bold uppercase text-green-800 py-1 mb-1">KHÁCH HÀNG: {contractData.buyer.name}</h3>
          <div className="space-y-1">
            <p><span className="font-bold">Địa chỉ:</span> {contractData.buyer.address}</p>
            <p><span className="font-bold">Điện thoại:</span> {contractData.buyer.phone}</p>
            <p>
              <span className="font-bold">CCCD:</span> {contractData.buyer.idCard || '--'}
              {contractData.buyer.idDate && (
                <>
                  <span className="font-bold ml-4">Ngày cấp:</span> {contractData.buyer.idDate}
                </>
              )}
              {contractData.buyer.idPlace && (
                <>
                  <span className="font-bold ml-4">Tại:</span> {contractData.buyer.idPlace}
                </>
              )}
            </p>
            {contractData.buyer.taxCode && (
              <p><span className="font-bold">Mã số thuế:</span> {contractData.buyer.taxCode}</p>
            )}
            {contractData.buyer.email && (
              <p><span className="font-bold">Email:</span> {contractData.buyer.email}</p>
            )}
          </div>
           <p className="italic mt-1">(“Bên B” hoặc “Khách Hàng”)</p>
        </div>

        <p className="mb-2">
          Bên Bán và Khách Hàng sau đây được gọi riêng là “Bên” và gọi chung là “Các Bên”.
          <br/>Các Bên cùng thỏa thuận và thống nhất như sau:
        </p>

        <h3 className="font-bold bg-gray-100 p-1 mb-2">Điều 1. Thông tin về xe, giá trị mua bán và thanh toán</h3>

        <p className="font-bold mb-2">1.1 Thông tin về xe và giá trị mua bán:</p>
        <div className="mb-2 border border-gray-400">
          <table className="w-full border-collapse text-center">
            <thead>
              <tr className="bg-gray-200 font-bold">
                <th className="border border-gray-400 p-1">Tên Hàng</th>
                <th className="border border-gray-400 p-1">Giá niêm yết<br/>(VNĐ)</th>
                <th className="border border-gray-400 p-1">Ưu đãi giảm giá<br/>(VNĐ)</th>
                <th className="border border-gray-400 p-1">Đơn giá bán<br/>(VNĐ)</th>
                <th className="border border-gray-400 p-1">Số lượng</th>
                <th className="border border-gray-400 p-1">Thành tiền<br/>(VNĐ)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-gray-400 p-2 text-left align-top">
                  <p className="font-bold text-blue-700">{contractData.vehicle.name}</p>
                  <p>(mua pin, không kèm sạc)</p>
                  <p>Màu ngoại thất: {contractData.vehicle.colorExt}</p>
                  <p>Màu nội thất: {contractData.vehicle.colorInt}</p>
                  <p>Tình trạng: {contractData.vehicle.status}</p>
                  <p>Thông số kỹ thuật: Theo tiêu chuẩn của Nhà sản xuất</p>
                  <p className="italic">(sau đây gọi là "Xe")</p>
                </td>
                <td className="border border-gray-400 p-2 align-top">{contractData.vehicle.price}</td>
                <td className="border border-gray-400 p-2 align-top">{contractData.vehicle.discount}</td>
                <td className="border border-gray-400 p-2 align-top font-bold">{contractData.vehicle.finalPrice}</td>
                <td className="border border-gray-400 p-2 align-top">0{contractData.vehicle.quantity}</td>
                <td className="border border-gray-400 p-2 align-top font-bold">{contractData.vehicle.total}</td>
              </tr>
              <tr className="bg-gray-50 font-bold">
                <td colSpan={5} className="border border-gray-400 p-2 text-right">Tổng cộng:</td>
                <td className="border border-gray-400 p-2 text-right text-red-600">{contractData.vehicle.total}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mb-2 italic">Bằng chữ: ({amountToWordsCapitalized(contract.totalAmount)})</p>
        <p className="mb-3">
          Giá bán đã bao gồm thuế tiêu thụ đặc biệt, thuế giá trị gia tăng (VAT), nhưng không bao gồm lệ phí trước bạ, chi phí đăng ký, lưu hành, bảo hiểm xe, phí dịch vụ thuê pin và các chi phí khác.
        </p>

        <p className="font-bold">1.2 Chính sách ưu đãi áp dụng:</p>
        <ul className="list-disc pl-6 mb-2 space-y-1">
          <li>Chương trình ưu đãi: "Mãnh liệt vì tương lai xanh" giảm giá 6% trên giá MSRP, áp dụng từ 04/01/2026 đến 31/12/2026 theo ngày xuất hóa đơn.</li>
          <li>Chương trình ưu đãi: Tặng 2 năm bảo hiểm có quy đổi tiền mặt.</li>
        </ul>
      </Page>

      {/* ================= PAGE 2 ================= */}
      <Page pageNumber={2}>
         <div className="space-y-4">
            <div>
               <p className="font-bold mb-1">1.3 Chính sách ưu đãi áp dụng:</p>
               <p className="mb-2">
                 Ưu đãi dành cho Doanh nghiệp Dịch vụ vận tải/cá nhân vận tải mua ô tô điện VinFast tại Thị trường Việt Nam khi đặt cọc, ký hợp đồng, thanh toán và xuất hóa đơn đến hết 31/12/2026:
               </p>
               <div className="pl-4 mb-2">
                 <p>a) Ưu đãi Chính sách Mãnh liệt vì tương lai xanh: Ưu đãi giảm 6% trên giá niêm yết.</p>
               </div>
               <p>
                 Thông tin chi tiết về chính sách ưu đãi được truyền thông, tư vấn đầy đủ, chính xác cho Khách Hàng hiểu và đồng ý.
                 Trường hợp Khách Hàng chậm trễ thanh toán/nhận Xe hoặc vi phạm bất kỳ nghĩa vụ nào trong Hợp Đồng, chính sách ưu đãi có thể được điều chỉnh hoặc hủy bỏ tùy thuộc vào quyết định của Bên Bán.
               </p>
            </div>

            <div>
               <p className="font-bold mb-1">1.4 Thanh toán tiền mua Xe:</p>
               {contract.paymentType === 'INSTALLMENT' ? (
                 <div className="pl-4 space-y-2">
                    <p>
                      a) <strong>Đợt 1:</strong> Khách Hàng đặt cọc cho Bên Bán số tiền: <strong>{new Intl.NumberFormat('vi-VN').format(depositAmount)} VNĐ/01 xe</strong> (Bằng chữ: {amountToWordsCapitalized(depositAmount)}) ngay sau khi ký Hợp Đồng nhưng không muộn hơn thời hạn áp dụng của chính sách ưu đãi nêu tại Điều 1.2 trên đây. Khoản tiền đặt cọc này sẽ tự động được khấu trừ để tiếp tục thanh toán Đợt 2 trước khi Bên Bán xuất hóa đơn bán Xe cho Khách Hàng.
                    </p>
                    <p>b) Tiến độ các đợt thanh toán tiếp theo như sau:</p>
                    <p className="underline font-semibold">Thanh toán trả góp:</p>
                    {installmentAmount > 0 && (
                      <p>
                        <strong>Đợt 2:</strong> Khách Hàng thanh toán số tiền đối ứng: <strong>{new Intl.NumberFormat('vi-VN').format(installmentAmount)} VNĐ</strong> (Bằng chữ: {amountToWordsCapitalized(installmentAmount)}) mua Xe bằng Tổng giá trị hợp đồng sau khi trừ đi số tiền đã đặt cọc và số tiền ngân hàng cam kết cho Khách Hàng vay theo Thông Báo Tín Dụng trong vòng 07 (bảy) ngày làm việc kể từ ngày Bên Bán thông báo về việc Xe sẵn có để giao cho Khách Hàng. Đồng thời, Khách Hàng bàn giao cho Sài Gòn GF bản gốc Thông Báo Tín Dụng của ngân hàng cam kết cho Khách Hàng vay số tiền để mua Xe.
                      </p>
                    )}
                    {loanAmount > 0 && (
                      <p>
                        <strong>Đợt 3:</strong> Ngân hàng thanh toán trực tiếp số tiền cam kết cho Khách Hàng vay: <strong>{new Intl.NumberFormat('vi-VN').format(loanAmount)} VNĐ</strong> (Bằng chữ: {amountToWordsCapitalized(loanAmount)}) theo Thông Báo Tín Dụng vào tài khoản của Bên Bán trong vòng 05 (năm) ngày làm việc kể từ ngày Bên Bán và Khách Hàng bàn giao Giấy hẹn lấy Chứng nhận đăng ký (hoặc Chứng nhận đăng ký) xe điện VinFast cho ngân hàng.
                      </p>
                    )}
                 </div>
               ) : (
                 <div className="pl-4 space-y-2">
                    <p>
                      a) <strong>Đợt 1:</strong> Khách Hàng đặt cọc cho Bên Bán số tiền: <strong>{new Intl.NumberFormat('vi-VN').format(depositAmount)} VNĐ/01 xe</strong> (Bằng chữ: {amountToWordsCapitalized(depositAmount)}) ngay sau khi ký Hợp Đồng nhưng không muộn hơn thời hạn áp dụng của chính sách ưu đãi nêu tại Điều 1.2 trên đây. Khoản tiền đặt cọc này sẽ tự động được khấu trừ để tiếp tục thanh toán Đợt 2 trước khi Bên Bán xuất hóa đơn bán Xe cho Khách Hàng.
                    </p>
                    <p>
                      b) <strong>Đợt 2:</strong> Khách Hàng thanh toán số tiền còn lại: <strong>{new Intl.NumberFormat('vi-VN').format(totalAmount - depositAmount)} VNĐ</strong> (Bằng chữ: {amountToWordsCapitalized(totalAmount - depositAmount)}) trong thời hạn 07 (bảy) ngày làm việc kể từ ngày Bên Bán thông báo về việc Xe sẵn có để giao cho Khách Hàng.
                    </p>
                 </div>
               )}
            </div>

            <div>
               <p className="font-bold mb-1">1.5 Phương thức thanh toán:</p>
               <p className="mb-2">Khách Hàng sẽ thanh toán theo hình thức chuyển khoản cho Bên Bán theo thông tin tài khoản như sau:</p>
               <div className="bg-gray-50 border border-gray-200 p-3 rounded ml-4">
                  <p>Chủ tài khoản: <strong>HỢP TÁC XÃ VẬN TẢI CẦN THƠ GF</strong></p>
                  <p>Số tài khoản: <strong>26868686668</strong></p>
                  <p>Ngân hàng: <strong>TPBank - CN Cần Thơ</strong></p>
               </div>
            </div>

            <h3 className="font-bold bg-gray-100 p-1">Điều 2. Thời gian và địa điểm giao Xe</h3>
            <div className="space-y-2">
               <p><strong>2.1 Thời gian giao Xe:</strong> Các Bên có thể thỏa thuận giao toàn bộ Xe quy định tại Điều 1.1 hoặc theo từng đợt, theo thông báo bằng văn bản/email/tin nhắn của Bên Bán trước 07 (bảy) ngày làm việc.</p>
               <p><strong>2.2</strong> Trừ trường hợp thanh toán trả góp theo quy định tại Điều 1.2 Điều Khoản Chung, Bên Bán sẽ bàn giao Xe cùng với hóa đơn và đầy đủ giấy tờ cho Khách Hàng sau khi nhận đủ 100% tổng giá trị mua bán của toàn bộ Xe hoặc 100% giá trị của từng đợt giao Xe (tùy từng trường hợp).</p>
               <p><strong>2.3</strong> Trường hợp thanh toán trả góp theo quy định tại Điều 1.2 Điều Khoản Chung, Bên Bán sẽ bàn giao Xe cùng với hóa đơn và đầy đủ giấy tờ cho Khách hàng sau khi nhận đủ Thông Báo Tín Dụng cam kết cho vay của Ngân hàng và khoản thanh toán Đợt 2 của Khách Hàng cho tổng giá trị mua bán của toàn bộ Xe hoặc từng đợt giao Xe (tùy từng trường hợp theo quy định tại Điều 2.1 của Hợp Đồng).</p>
               <p><strong>2.4 Địa điểm giao Xe:</strong> Bên Bán</p>
               <p>Trong mọi trường hợp, nếu Khách Hàng thay đổi đầu mối nhận và ký Biên bản bàn giao xe, Khách Hàng phải gửi thông báo bằng văn bản/email/tin nhắn về việc thay đổi này cho Bên Bán trước ít nhất 03 (ba) ngày làm việc trước ngày bàn giao Xe.</p>
               <p>Biên bản bàn giao Xe và Pin như được quy định tại Phụ lục 01 của Hợp Đồng này.</p>
            </div>
         </div>
      </Page>

      {/* ================= PAGE 3 ================= */}
      <Page pageNumber={3}>
         <div className="space-y-4">
            <div>
               <h3 className="font-bold bg-gray-100 p-1 mb-2">Điều 3. Điều khoản chung</h3>
               <p className="mb-1">
                 3.1 Hợp Đồng này được điều chỉnh bởi các điều khoản và điều kiện chung về việc mua bán xe điện VinFast đính kèm ("Điều Khoản Chung"). Trong trường hợp có sự không thống nhất giữa Hợp Đồng và Điều Khoản Chung, các quy định tại Hợp Đồng sẽ được ưu tiên áp dụng. Điều Khoản Chung, các phụ lục đi kèm (nếu có) và Biên bản bàn giao Xe là một phần không tách rời của Hợp Đồng.
               </p>
               <p>
                 3.2 Hợp Đồng có hiệu lực kể từ ngày ký và được lập thành 04 (bốn) bản có giá trị như nhau, mỗi Bên giữ 02 (hai) bản để thực hiện.
               </p>
            </div>

            {/* SIGNATURE SECTION */}
            <div className="grid grid-cols-2 gap-8 py-6 my-4 border-t border-b border-gray-300">
              <div className="text-center relative">
                <p className="font-bold uppercase mb-4">KHÁCH HÀNG</p>
                <div className="h-32 flex flex-col items-center justify-center relative">
                  {/* Ẩn phần chữ ký nhưng giữ khoảng cách */}
                  <div className="w-full h-full invisible">
                  </div>
                </div>
                <div className="font-bold mt-4 text-center">
                  <p className="invisible">GIÁM ĐỐC</p>
                  <p>{contractData.buyer.name.toUpperCase()}</p>
                </div>
              </div>

              <div className="text-center">
                <p className="font-bold uppercase mb-4">HỢP TÁC XÃ VẬN TẢI CẦN THƠ GF</p>
                <div className="h-32 flex items-center justify-center">
                  {/* Ẩn phần chữ ký nhưng giữ khoảng cách */}
                  <div className="w-full h-full invisible">
                  </div>
                </div>
                <div className="font-bold mt-4 text-center">
                  <p>GIÁM ĐỐC</p>
                  <p>PHAN PHÚC HẬU</p>
                </div>
              </div>
            </div>
         </div>
      </Page>

      {/* ================= PAGE 4 - GENERAL TERMS ================= */}
      <Page pageNumber={4}>
         <div className="space-y-2">
            {/* GENERAL TERMS HEADER */}
            <div className="text-center mt-2 mb-3">
              <h2 className="text-lg font-bold uppercase">ĐIỀU KHOẢN VÀ ĐIỀU KIỆN CHUNG<br/>VỀ VIỆC MUA BÁN XE ĐIỆN VINFAST</h2>
              <p className="italic mt-1">Đính kèm và là một phần không tách rời của Hợp đồng mua bán xe điện VinFast ("Hợp Đồng") được ký kết giữa Bên Bán và Khách Hàng</p>
            </div>

            <div>
               <h4 className="font-bold underline mb-1">Điều 1. Thanh toán tiền mua Xe</h4>
               <p className="font-bold">1.1 Đối với Khách Hàng thanh toán trả thẳng:</p>
               <p className="mb-1">
                 Khách Hàng sẽ thanh toán đầy đủ số tiền đặt cọc mua Xe cho Bên Bán ngay sau khi ký Hợp Đồng nhưng không muộn hơn thời hạn của các chính sách ưu đãi áp dụng. Nếu quá thời gian trên mà Bên Bán không nhận được đầy đủ tiền đặt cọc, Hợp Đồng này sẽ tự động hết hiệu lực.
                 <br/>
                 Số tiền còn lại của Hợp Đồng sẽ được Khách Hàng thanh toán đầy đủ cho Bên Bán trong thời hạn 07 (bảy) ngày làm việc kể từ ngày nhận được thông báo từ Bên Bán về việc Xe sẵn có để giao cho Khách Hàng và trong mọi trường hợp phải trước thời điểm nhận Xe. Quá thời hạn này mà Khách Hàng chưa thực hiện đầy đủ nghĩa vụ thanh toán, Bên Bán có quyền chấm dứt Hợp Đồng và khoản tiền đặt cọc nêu trên sẽ thuộc về Bên Bán.
               </p>
            </div>

            <div className="mt-2">
               <p className="font-bold">1.2 Đối với Khách Hàng thanh toán trả góp:</p>
               <div className="pl-4 space-y-1 mt-0.5">
                 <p>
                   a) <strong>Đợt 1 (Đặt cọc):</strong> Khách Hàng sẽ đặt cọc số tiền đặt cọc để mua Xe ngay sau khi ký Hợp Đồng nhưng không muộn hơn thời hạn của chính sách ưu đãi áp dụng. Nếu quá thời gian trên mà Bên Bán không nhận được đầy đủ tiền đặt cọc, Hợp Đồng này sẽ tự động hết hiệu lực.
                 </p>
                 <p>
                   b) <strong>Đợt 2:</strong> Trong vòng 07 (bảy) ngày làm việc kể từ ngày Bên Bán thông báo về việc Xe sẵn có để giao cho Khách Hàng, Khách Hàng sẽ thanh toán số tiền Đợt 2 cho VinFast Trading, đồng thời bàn giao cho Bên Bán bản gốc thông báo, xác nhận hoặc cam kết bằng văn bản của ngân hàng thương mại được thành lập hợp pháp tại Việt Nam, theo đó cam kết (1) cho Khách Hàng vay một khoản tiền để mua Xe và (2) thanh toán đúng hạn số tiền đó trực tiếp vào tài khoản của Bên Bán (sau đây gọi là “Thông Báo Tín Dụng”).
                 </p>
                 <div className="pl-4 space-y-0.5">
                   <p>
                     (i) Nếu quá thời hạn 07 (bảy) ngày làm việc kể từ ngày Bên Bán thông báo về việc Xe sẵn có để giao cho Khách Hàng mà Khách Hàng không thanh toán đầy đủ số tiền Đợt 2 và cung cấp Thông Báo Tín Dụng hợp lệ, Hợp Đồng này sẽ chấm dứt và Bên Bán được giữ lại khoản tiền đặt cọc.
                   </p>
                   <p>
                     (ii) Sau khi nhận được khoản thanh toán Đợt 2 và chấp nhận Thông Báo Tín Dụng, Bên Bán sẽ xuất hoá đơn và thực hiện bàn giao Xe để Khách Hàng làm thủ tục đăng ký Xe trong vòng 07 (bảy) ngày làm việc kế tiếp, nếu quá thời hạn này mà Khách Hàng không đi làm thủ tục đăng ký Xe thì VinFast Trading được quyền hủy hóa đơn và Hợp Đồng này sẽ chấm dứt. Trong trường hợp này, Bên Bán được giữ lại các khoản tiền mà Khách Hàng đã đặt cọc và thanh toán.
                   </p>
                 </div>
                 <p>
                   c) <strong>Đợt 3:</strong> Số tiền còn lại (sau khi khấu trừ các khoản tiền mà Khách Hàng đã đặt cọc và thanh toán trước đó) phải được ngân hàng thanh toán trực tiếp vào tài khoản của Bên Bán trong vòng 05 (năm) ngày làm việc kể từ ngày Bên Bán và Khách Hàng bàn giao Giấy hẹn lấy Chứng nhận đăng ký (hoặc Chứng nhận đăng ký) xe điện cho ngân hàng.
                 </p>
                 <p>
                   Nếu vì bất cứ lý do gì mà ngân hàng không giải ngân đầy đủ và đúng hạn số tiền còn lại cho Bên Bán thì:
                 </p>
                 <div className="pl-4 space-y-0.5">
                   <p>
                     (i) Trong vòng 10 (mười) ngày làm việc kể từ ngày Bên Bán yêu cầu, Khách Hàng sẽ tự mình thanh toán đầy đủ cho Bên Bán toàn bộ số tiền còn lại.
                   </p>
                   <p>
                     (ii) Sau thời hạn nêu tại điểm 1.2c(i) nêu trên, nếu Bên Bán không nhận được số tiền còn lại của Đợt 3 thì Bên Bán có quyền yêu cầu Khách Hàng thực hiện theo phương án do Bên Bán đưa ra bao gồm nhưng không giới hạn ở việc, Khách Hàng đồng ý cho Bên Bán hoặc cho bên thứ ba do Bên Bán lựa chọn, yêu cầu Khách Hàng phối hợp và/hoặc thay mặt và đại diện Khách Hàng ký tên trên các tài liệu và thực hiện các thủ tục cần thiết liên quan đến việc thanh lý xe để thu hồi các khoản tiền mà Khách Hàng còn nợ Bên Bán. Khoản tiền thu được khi xử lý Xe sẽ ưu tiên thanh toán các khoản nợ của Khách Hàng đối với Bên Bán. Khách Hàng sẽ chịu mọi chi phí và thiệt hại phát sinh để xử lý Xe, và thanh toán cho Bên Bán thù lao ủy quyền bằng 10% giá trị Xe tại thời điểm xử lý.
                   </p>
                 </div>
                 <p>
                   Bên cạnh đó, Khách Hàng đồng ý chịu mọi chi phí phát sinh, bao gồm phí bãi đỗ Xe, phí bảo quản Xe, thuế trước bạ, lệ phí đăng ký Xe, lệ phí công chứng, các khoản chi phí liên quan khác, đồng thời bồi thường mọi thiệt hại mà Bên Bán phải gánh chịu.
                 </p>
               </div>
            </div>

            <div className="mt-2">
              <p className="font-bold">1.3 Phương thức thanh toán:</p>
              <p>Chuyển khoản vào tài khoản của Bên Bán theo thông tin nêu tại Hợp Đồng. Nội dung chuyển khoản ghi theo cú pháp: [Tên Khách Hàng_Số điện thoại_Số hợp đồng mua bán/Số đơn hàng_Model Xe]. Mọi chi phí liên quan đến việc chuyển khoản do Khách Hàng chịu.</p>
            </div>
         </div>
      </Page>

      {/* ================= PAGE 5 ================= */}
      <Page pageNumber={5}>
         <div className="space-y-2">

            <div>
               <h4 className="font-bold underline mb-1">Điều 3. Bảo hành</h4>
               <p>3.1 Chi tiết về bảo hành: theo điều khoản bảo hành quy định tại sổ bảo hành do hãng VinFast cung cấp cho Khách Hàng.</p>
               <p>3.2 Địa điểm bảo hành: tại các Trung tâm dịch vụ sửa chữa xe điện/Đại lý phân phối được ủy quyền của hãng VinFast.</p>
            </div>

            <div>
               <h4 className="font-bold underline mb-1">Điều 4. Trách nhiệm của Các Bên</h4>
               <p>4.1 Bên Bán có nghĩa vụ giao Xe theo quy định tại Hợp Đồng, trừ trường hợp bất khả kháng.</p>
               <p>4.2 Bên Bán có nghĩa vụ cung cấp đầy đủ hóa đơn, chứng từ, tài liệu hợp lệ cho Khách Hàng theo quy định tại Hợp Đồng này.</p>
               <p>4.3 Khách Hàng có trách nhiệm thanh toán và nhận Xe theo đúng thời gian đã quy định và chịu mọi chi phí liên quan đến thủ tục đăng ký, lưu hành và bảo hiểm Xe. Đồng thời có trách nhiệm bàn giao 01 bản sao y công chứng Giấy Chứng nhận đăng ký xe hợp lệ của mỗi xe cho Bên Bán trong vòng 30 (ba mươi) ngày kể từ ngày hoàn tất thủ tục đăng ký Xe.</p>
               <p>4.4 Khách Hàng không sử dụng hình ảnh logo VinFast/ Bên Bán để quảng cáo bán xe dưới mọi hình thức khi chưa được sự đồng ý bằng văn bản từ hãng VinFast.</p>
               <p>4.5 Khách Hàng có trách nhiệm và bảo đảm các Xe mua theo Hợp Đồng này được đăng ký và lưu hành xe dưới hình thức kinh doanh vận tải (đăng ký biển vàng), không thay đổi hình thức đăng ký và lưu hành xe (chuyển đổi từ biển nền màu vàng sang biển nền màu trắng) trong vòng 01 (một) năm kể từ ngày hoàn tất đăng ký Xe.</p>
               <p>4.6 Khách Hàng có trách nhiệm lấy đủ số lượng xe đã đặt cọc trong vòng 365 ngày để hưởng ưu đãi từ Bên Bán theo số xe thực thuê, mua.</p>
            </div>

            <div className="mt-2">
               <p>4.7 Khách Hàng hiểu rằng và đồng ý rằng:</p>
               <div className="pl-4 mt-1 space-y-0.5">
                 <p>(i) Xe chỉ hoạt động tốt khi được sử dụng với pin và thiết bị sạc chính hãng được sản xuất bởi VinFast hoặc nhà sản xuất do VinFast chỉ định, theo các điều kiện quy định tại hướng dẫn sử dụng pin được nêu trong tài liệu kỹ thuật mà Khách Hàng được bàn giao cùng với Xe hoặc được nêu chi tiết trên Website.</p>
                 <p>(ii) Các hư hỏng do nguyên nhân của việc sửa chữa, điều chỉnh, đấu nối phụ kiện không chính hãng, hoán cải trái phép so với thiết kế ban đầu như thay đổi công suất hoặc cấu trúc Xe…; hư hỏng phát sinh do việc sử dụng phụ tùng, pin và thiết bị sạc không chính hãng hoặc sử dụng không đúng hướng dẫn của nhà sản xuất sẽ không thuộc phạm vi bảo hành. VinFast Trading và nhà sản xuất được miễn trừ trách nhiệm đối với mọi tổn thất và thiệt hại (nếu có) phát sinh từ hoặc có liên quan đến các hoạt động kể trên.</p>
               </div>
               <p className="mt-1">
                 b) Khách Hàng hiểu và đồng ý rằng Xe đã được tích hợp sẵn chip eSIM vào phần cứng, gắn liền trên Xe và không thể tháo rời. Chip eSIM cho phép Xe kết nối với mạng viễn thông nhằm cung cấp các loại dịch vụ:
                 <br/>● Tạo và nhận cuộc gọi, hỗ trợ cho tính năng cứu hộ khẩn cấp (e-Call);
                 <br/>● Kết nối mạng dữ liệu di động để truyền nhận dữ liệu cho các tính năng thông minh và dịch vụ giải trí trên Xe;
                 <br/>● Nhận tin nhắn SMS khi có yêu cầu từ hệ thống điều khiển dịch vụ từ trung tâm điều hành của VinFast.
                 <br/>Chip eSIM gắn trên Xe đã được đăng ký thuê bao hòa mạng bởi VinFast với nhà cung cấp dịch vụ viễn thông mà VinFast hợp tác. Để sử dụng các dịch vụ nêu trên, Khách Hàng cần duy trì gói thuê bao và thanh toán cước phí cho nhà cung cấp dịch vụ viễn thông. Khách Hàng được thay đổi dịch vụ của các nhà cung cấp dịch vụ viễn thông đã ký hợp tác với VinFast. Thông tin chi tiết về các nhà cung cấp dịch vụ viễn thông, các gói thuê bao, cước phí, phí chuyển đổi nhà cung cấp dịch vụ viễn thông và hướng dẫn thanh toán được niêm yết tại Website.
               </p>
            </div>

            <div className="mt-2">
               <h4 className="font-bold underline mb-1">Điều 5. Chuyển rủi ro và quyền sở hữu</h4>
               <p>Trừ trường hợp Hợp Đồng có quy định khác, toàn bộ quyền sở hữu đối với Xe, rủi ro và lợi ích liên quan đến Xe sẽ được chuyển giao sang cho Khách Hàng khi Xe được bàn giao cho Khách Hàng hoặc người đại diện hợp pháp của Khách Hàng.</p>
            </div>

            <div className="mt-2">
               <h4 className="font-bold underline mb-1">Điều 6. Bất khả kháng</h4>
               <p>Bất khả kháng có nghĩa là bất kỳ sự kiện nào dưới đây ngăn trở một trong các bên thực hiện nghĩa vụ được nêu trong Hợp Đồng này: chiến tranh, nổi dậy, đình công, tranh chấp lao động; hỏa hoạn, lũ lụt hoặc thiên tai; thiếu hụt nhân lực, nguyên vật liệu, phương tiện vận chuyển hoặc tiện ích; chậm trễ cung cấp nguyên vật liệu nào từ nhà cung cấp; quy định của nhà nước; hoặc hoàn cảnh tương tự. Khi xảy ra sự kiện bất khả kháng, bên gặp phải bất khả kháng phải thông báo cho bên kia tình trạng thực tế, đề xuất phương án xử lý và nỗ lực giảm thiểu tổn thất, thiệt hại đến mức thấp nhất có thể.</p>
            </div>

            <div className="mt-2">
               <h4 className="font-bold underline mb-1">Điều 7. Chính sách quyền riêng tư</h4>
               <p>7.1. Các Bên cam kết tuân thủ nghiêm ngặt các quy định của Việt Nam về quyền riêng tư và bảo vệ dữ liệu cá nhân áp dụng vào từng thời điểm của Hợp Đồng (sau đây gọi chung là "Quy Định Pháp Luật BVDLCN Hiện Hành").</p>
               <p>7.2. Khách Hàng xác nhận rằng sau khi nhận bàn giao Xe, Khách Hàng sẽ đóng vai trò là bên Kiểm Soát Dữ Liệu Cá Nhân, tự mình chịu trách nhiệm đối với các dữ liệu cá nhân được thu thập và xử lý trong quá trình sử dụng và vận hành Xe. VinFast Trading sẽ hoạt động độc lập với tư cách bên Kiểm Soát Dữ Liệu Cá Nhân và là chủ sở hữu dữ liệu, trong phạm vi pháp luật cho phép, liên quan đến dữ liệu sử dụng cho Xe nhằm mục đích chẩn đoán Xe, giám sát an toàn và cải tiến dịch vụ theo Chính Sách Bảo Vệ Dữ Liệu Cá Nhân của VinFast.</p>
               <p>7.3. Các Bên cam kết áp dụng các biện pháp bảo mật kỹ thuật và tổ chức phù hợp, tuân thủ Quy Định Pháp Luật BVDLCN Hiện Hành.</p>
            </div>
         </div>
      </Page>

      {/* ================= PAGE 6 ================= */}
      <Page pageNumber={6}>
         <div className="space-y-2">

            <div>
               <h4 className="font-bold underline mb-1">Điều 8. Hiệu lực và Chấm dứt Hợp Đồng</h4>
               <p>8.1. Các Bên có thỏa thuận chấm dứt Hợp Đồng;</p>
               <p>8.2. Bên Bán có quyền đơn phương chấm dứt Hợp Đồng nếu Khách Hàng vi phạm bất kỳ nghĩa vụ nào mà không khắc phục hoặc không thể khắc phục toàn bộ trong 10 (mười) ngày kể từ ngày đến hạn hoặc được thông báo và Khách Hàng sẽ không được nhận lại khoản tiền đặt cọc. Bên Bán, tùy theo quyết định của mình, có quyền đơn phương chấm dứt Hợp Đồng mà không phải chịu bất kỳ chế tài nào với điều kiện phải thông báo cho Khách Hàng trước ít nhất 07 (bảy) ngày.</p>
            </div>

            <div>
               <h4 className="font-bold underline mb-1">Điều 9. Điều khoản cuối cùng</h4>
               <p>9.1. Khách Hàng đồng ý rằng: Bên Bán có thể chuyển giao Hợp Đồng này cho công ty con/liên kết của mình hoặc công ty mới thành lập do tái cơ cấu Bên Bán sau khi gửi cho Khách Hàng thông báo bằng văn bản ít nhất 05 (năm) ngày làm việc trước ngày chuyển giao. Trong vòng 05 (năm) ngày làm việc kể từ ngày thông báo mà Bên Bán không nhận được ý kiến phản hồi bằng văn bản của Khách Hàng thì được hiểu là Khách Hàng đã chấp thuận việc chuyển giao nêu trên.</p>
               <p>9.2. Mọi tranh chấp liên quan đến Hợp Đồng nếu không được giải quyết thông qua thương lượng thì sẽ được giải quyết tại tòa án có thẩm quyền.</p>
            </div>

            <div className="pt-4 text-center text-xs text-gray-400 italic">
               --- Hết nội dung Hợp Đồng ---
            </div>
         </div>
      </Page>

    </div>
  );
};