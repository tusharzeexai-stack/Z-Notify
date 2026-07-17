import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.database import Base, get_db
from main import app
from app.modules.myscheme_sync.schemas.sync_schemas import SchemeCreate, SchemeFAQSchema
from app.modules.myscheme_sync.repositories.scheme_repository import scheme_repository
from app.modules.myscheme_sync.parser.scheme_parser import scheme_parser

# Setup in-memory SQLite database for fast unit testing
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)

def test_ensure_categories_exist():
    db = TestingSessionLocal()
    try:
        cats_map = scheme_repository.ensure_categories_exist(db)
        assert len(cats_map) >= 4
        assert "agriculture-rural-environment" in cats_map
        assert "health-wellness" in cats_map
    finally:
        db.close()

def test_upsert_scheme():
    db = TestingSessionLocal()
    try:
        cats = scheme_repository.ensure_categories_exist(db)
        welfare_cat = cats["agriculture-rural-environment"]

        scheme_in = SchemeCreate(
            scheme_name="PM Kisan Samman Nidhi",
            slug="pm-kisan-samman-nidhi",
            category_id=welfare_cat.id,
            description="Income support for all landholding farmers' families in the country.",
            benefits="Rs 6000 per year in three equal installments",
            eligibility="All landholding farmers families",
            documents="Aadhaar Card, Land Holding Papers, Bank Account",
            application_process="Apply online at pmkisan.gov.in",
            official_url="https://pmkisan.gov.in",
            application_url="https://pmkisan.gov.in/registration",
            ministry="Ministry of Agriculture and Farmers Welfare",
            state="All India",
            status="active",
            source_url="https://www.myscheme.gov.in/schemes/pm-kisan",
            documents_list=["Aadhaar Card", "Land Proof"],
            faqs_list=[SchemeFAQSchema(question="How much benefit is provided?", answer="Rs. 6000 per year.")]
        )

        scheme_obj, is_new = scheme_repository.upsert_scheme(db, scheme_in)
        assert is_new is True
        assert scheme_obj.scheme_name == "PM Kisan Samman Nidhi"
        assert scheme_obj.slug == "pm-kisan-samman-nidhi"

        # Update test
        scheme_in.description = "Updated description for PM Kisan."
        updated_obj, is_new_again = scheme_repository.upsert_scheme(db, scheme_in)
        assert is_new_again is False
        assert updated_obj.description == "Updated description for PM Kisan."
    finally:
        db.close()

def test_search_schemes_api():
    db = TestingSessionLocal()
    try:
        cats = scheme_repository.ensure_categories_exist(db)
        health_cat = cats["health-wellness"]

        scheme_in = SchemeCreate(
            scheme_name="Ayushman Bharat PM-JAY",
            slug="ayushman-bharat-pm-jay",
            category_id=health_cat.id,
            description="Health insurance coverage up to 5 lakh per family per year.",
            benefits="Rs 500,000 health cover for secondary and tertiary care hospitalization.",
            eligibility="Low income families based on SECC data",
            documents="Aadhaar Card, Ration Card",
            application_process="Verify eligibility at nearest empaneled hospital.",
            official_url="https://pmjay.gov.in",
            application_url="https://pmjay.gov.in",
            ministry="Ministry of Health and Family Welfare",
            state="All India",
            status="active",
            source_url="https://www.myscheme.gov.in/schemes/ayushman-bharat",
            documents_list=["Aadhaar Card"],
            faqs_list=[]
        )
        scheme_repository.upsert_scheme(db, scheme_in)
    finally:
        db.close()

    response = client.get("/api/schemes?keyword=Ayushman")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 1
    assert data["items"][0]["scheme_name"] == "Ayushman Bharat PM-JAY"

def test_sync_status_api():
    response = client.get("/api/admin/sync/status")
    assert response.status_code == 200
    data = response.json()
    assert "enabled" in data
    assert "total_categories" in data
