#include <iostream>
#include <fstream>
#include <stdexcept>
using namespace std;

string name[500], Father_NIC[500], Mother_name[500], Birht_certificate[500], 
       Resident_form[500], NIC_STORE[500], Maternal_marital[500];
int total = 0;

const string FILE_NAME = "nadra_records.txt";

void saveToFile() {
    try {
        ofstream file(FILE_NAME);
        if (!file.is_open()) throw runtime_error("Could not open file for saving.");
        
        file << total << "\n";
        for (int i = 1; i <= total; i++) {
            file << name[i] << "\n"
                 << Father_NIC[i] << "\n"
                 << Mother_name[i] << "\n"
                 << Birht_certificate[i] << "\n"
                 << Resident_form[i] << "\n"
                 << Maternal_marital[i] << "\n"
                 << NIC_STORE[i] << "\n";
        }
        file.close();
        cout << "Records saved successfully.\n";
    } catch (runtime_error& e) {
        cout << "File Error: " << e.what() << endl;
    }
}

void loadFromFile() {
    try {
        ifstream file(FILE_NAME);
        if (!file.is_open()) {
            cout << "No existing records file found. Starting fresh.\n";
            return;
        }
        
        file >> total;
        file.ignore();
        for (int i = 1; i <= total; i++) {
            getline(file, name[i]);
            getline(file, Father_NIC[i]);
            getline(file, Mother_name[i]);
            getline(file, Birht_certificate[i]);
            getline(file, Resident_form[i]);
            getline(file, Maternal_marital[i]);
            getline(file, NIC_STORE[i]);
        }
        file.close();
        cout << "Records loaded successfully. Total records: " << total << "\n";
    } catch (runtime_error& e) {
        cout << "File Error: " << e.what() << endl;
    }
}

void new_identity_card() {
    try {
        int num, age;
        cout << "How many persons are going to apply for NIC card?" << endl;
        cin >> num;
        if (cin.fail()) throw invalid_argument("Invalid input. Please enter a number.");

        cout << "The age must be 18 to apply for NIC Card" << endl;
        cin >> age;
        if (cin.fail()) throw invalid_argument("Invalid input. Please enter a number.");

        if (age < 18) {
            cout << "You are not eligible for NIC Card (must be 18+)." << endl;
            return;
        }

        int start = total + 1;
        total = total + num;

        for (int i = start; i <= total; i++) {
            cout << "\n\"Enter the data of person " << i << "\"" << endl;
            cout << "Enter name of person: ";
            cin >> name[i];
            cout << "Enter father or another relative NIC number: ";
            cin >> Father_NIC[i];
            cout << "Enter mother name of person: ";
            cin >> Mother_name[i];
            cout << "Enter birth certificate or SSCII certificate: ";
            cin >> Birht_certificate[i];
            cout << "Enter resident form number: ";
            cin >> Resident_form[i];
            cout << "Enter marital status: ";
            cin >> Maternal_marital[i];
            cout << "Give the NIC number to person: ";
            cin >> NIC_STORE[i];
            cout << endl;
        }
        saveToFile();

    } catch (invalid_argument& e) {
        cin.clear();
        cin.ignore(1000, '\n');
        cout << "Input Error: " << e.what() << endl;
    }
}

void allRecords() {
    if (total == 0) {
        cout << "No Records ---- Press 1 to enter records" << endl;
        return;
    }
    cout << "-> Records of all Persons\n\n";
    for (int i = 1; i <= total; i++) {
        cout << "\"Record of person " << i << "\"\n\n";
        cout << "Name: "                  << name[i]              << "\n";
        cout << "Father NIC number: "     << Father_NIC[i]        << "\n";
        cout << "Mother name: "           << Mother_name[i]       << "\n";
        cout << "Birth certificate: "     << Birht_certificate[i] << "\n";
        cout << "Resident form number: "  << Resident_form[i]     << "\n";
        cout << "Marital Status: "        << Maternal_marital[i]  << "\n";
        cout << "NIC number: "            << NIC_STORE[i]         << "\n\n";
    }
}

void searchRecord() {
    try {
        if (total == 0) {
            cout << "No Records ---- Press 1 to enter records" << endl;
            return;
        }
        cout << "Enter NIC number to search: ";
        string rroll;
        cin >> rroll;
        if (rroll.empty()) throw invalid_argument("NIC number cannot be empty.");

        bool found = false;
        for (int i = 1; i <= total; i++) {
            if (rroll == NIC_STORE[i]) {
                found = true;
                cout << "\n\"Record of person\"\n\n";
                cout << "Name: "                 << name[i]              << "\n";
                cout << "NIC Number: "           << NIC_STORE[i]         << "\n";
                cout << "Father NIC: "           << Father_NIC[i]        << "\n";
                cout << "Mother name: "          << Mother_name[i]       << "\n";
                cout << "Birth certificate: "    << Birht_certificate[i] << "\n";
                cout << "Resident form number: " << Resident_form[i]     << "\n";
                cout << "Marital Status: "       << Maternal_marital[i]  << "\n\n";
            }
        }
        if (!found) cout << "No record found with NIC: " << rroll << endl;

    } catch (invalid_argument& e) {
        cout << "Input Error: " << e.what() << endl;
    }
}

void updateRecord() {
    try {
        cout << "Enter NIC number to update: ";
        string rollnum1;
        cin >> rollnum1;
        if (rollnum1.empty()) throw invalid_argument("NIC number cannot be empty.");

        bool found = false;
        for (int i = 1; i <= total; i++) {
            if (rollnum1 == NIC_STORE[i]) {
                found = true;
                cout << "\n\"Previous record of Person\"\n\n";
                cout << "Name: "                 << name[i]              << "\n";
                cout << "Father NIC: "           << Father_NIC[i]        << "\n";
                cout << "NIC Number: "           << NIC_STORE[i]         << "\n";
                cout << "Mother name: "          << Mother_name[i]       << "\n";
                cout << "Birth certificate: "    << Birht_certificate[i] << "\n";
                cout << "Resident form number: " << Resident_form[i]     << "\n";
                cout << "Marital Status: "       << Maternal_marital[i]  << "\n\n";

                cout << "Enter updated data:\n";
                cout << "Name: ";              cin >> name[i];
                cout << "New NIC number: ";    cin >> NIC_STORE[i];
                cout << "Father NIC: ";        cin >> Father_NIC[i];
                cout << "Mother name: ";       cin >> Mother_name[i];
                cout << "Birth certificate: "; cin >> Birht_certificate[i];
                cout << "Resident form number: "; cin >> Resident_form[i];
                cout << "Marital status: ";    cin >> Maternal_marital[i];
                cout << "\nRecord updated successfully.\n";
            }
        }
        if (!found) cout << "No record found with NIC: " << rollnum1 << endl;
        else saveToFile();

    } catch (invalid_argument& e) {
        cout << "Input Error: " << e.what() << endl;
    }
}

void deleteRecord() {
    try {
        int opt;
        cout << "Press 1 to delete all records\n";
        cout << "Press 2 to delete a specific record\n";
        cin >> opt;
        if (cin.fail()) throw invalid_argument("Invalid option entered.");

        if (opt == 1) {
            total = 0;
            cout << "All records have been deleted.\n";
            saveToFile();
        } else if (opt == 2) {
            string rollno;
            cout << "Enter NIC number to delete: ";
            cin >> rollno;

            bool found = false;
            for (int i = 1; i <= total; i++) {
                if (rollno == NIC_STORE[i]) {
                    found = true;
                    for (int j = i; j < total; j++) {
                        NIC_STORE[j]        = NIC_STORE[j + 1];
                        name[j]             = name[j + 1];
                        Father_NIC[j]       = Father_NIC[j + 1];
                        Mother_name[j]      = Mother_name[j + 1];
                        Birht_certificate[j]= Birht_certificate[j + 1];
                        Resident_form[j]    = Resident_form[j + 1];
                        Maternal_marital[j] = Maternal_marital[j + 1];
                    }
                    total--;
                    cout << "Record deleted successfully.\n";
                    break;
                }
            }
            if (!found) cout << "No record found with NIC: " << rollno << endl;
            else saveToFile();
        } else {
            cout << "Invalid option.\n";
        }
    } catch (invalid_argument& e) {
        cin.clear();
        cin.ignore(1000, '\n');
        cout << "Input Error: " << e.what() << endl;
    }
}

int main() {
    loadFromFile();

    while (true) {
        int press;
        cout << "\n\n\t\t----- Welcome to NADRA Management System -----\n\n";
        cout << "Press 1 to make a new NIC Card\n";
        cout << "Press 2 to show all records\n";
        cout << "Press 3 to search a record\n";
        cout << "Press 4 to update a record\n";
        cout << "Press 5 to delete a record\n";
        cout << "Press 6 to exit\n\n";
        cin >> press;

        if (cin.fail()) {
            cin.clear();
            cin.ignore(1000, '\n');
            cout << "Invalid input. Please enter a number between 1 and 6.\n";
            continue;
        }

        cout << endl;
        switch (press) {
            case 1: new_identity_card(); break;
            case 2: allRecords();        break;
            case 3: searchRecord();      break;
            case 4: updateRecord();      break;
            case 5: deleteRecord();      break;
            case 6: exit(0);
            default: cout << "Invalid option. Please enter a number between 1 and 6.\n";
        }
    }
    return 0;
}