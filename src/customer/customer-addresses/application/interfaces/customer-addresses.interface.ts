export interface CustomerAddressesCacheQKI {
    customerUUID: string;
};

export interface CustomerAddressI {
    uuid: string;
    recipientName: string;
    recipientLastName: string;
    country: string;
    state: string;
    city: string;
    locality: string;
    streetName: string;
    neighborhood: string;
    zipCode: string;
    addressType: string;
    floor: string | null;
    number: string;
    aditionalNumber: string | null;
    referencesOrComments: string | null;
    countryPhoneCode: string;
    contactNumber: string;
    defaultAddress: boolean;
};

export interface GetCustomerAddressesI {
    data: CustomerAddressI[];
    totalPages: number;
    totalRecords: number;
    currentPage: number;
}