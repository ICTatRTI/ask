defmodule Ask.UserControllerTest do

  import Ecto.Query

  use Ask.ConnCase
  use Ask.TestHelpers

  setup %{conn: conn} do
    user = insert(:user)
    conn = conn
      |> put_private(:test_user, user)
      |> put_req_header("accept", "application/json")

    {:ok, conn: conn, user: user}
  end

  test "updates settings", %{conn: conn, user: user} do
    attrs = %{settings: %{onboarding: %{questionnaire: true}}}
    conn = put conn, user_path(conn, :update, user), user: attrs
    assert json_response(conn, 200)["data"]["settings"]["onboarding"]["questionnaire"]
  end

end
