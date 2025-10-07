/**
 * User mutation atoms
 *
 * Contains mutation atoms for user operations:
 * - Updating user profile
 *
 * Note: User uses a single object structure (not arrays),
 * so they use createMutation directly instead of createEntityMutation.
 */

import {
  type User,
  type UpdateUserRequest,
  type UpdateUserResponse,
  UpdateUserResponseSchema,
  UserUpdateSerializationSchema,
  type AvatarFilePath,
  createAvatarFilePath,
  API_ROUTES,
} from "@tasktrove/types";
import { DEFAULT_USER } from "@tasktrove/types/defaults";
import { USER_QUERY_KEY } from "@tasktrove/constants";
import { createMutation } from "./factory";

// =============================================================================
// USER MUTATION ATOMS
// =============================================================================

/**
 * User update mutation atom
 *
 * Updates user profile data and optimistically applies changes.
 * Handles avatar conversion from base64 to file path.
 */
export const updateUserMutationAtom = createMutation<
  UpdateUserResponse,
  UpdateUserRequest,
  User
>({
  method: "PATCH",
  operationName: "Updated user",
  apiEndpoint: API_ROUTES.USER,
  resourceQueryKey: USER_QUERY_KEY,
  defaultResourceValue: DEFAULT_USER,
  responseSchema: UpdateUserResponseSchema,
  serializationSchema: UserUpdateSerializationSchema,
  logModule: "user",
  testResponseFactory: (variables: UpdateUserRequest) => {
    // For test mode, merge updates with default user
    // Simulate avatar conversion: base64 -> file path (in real API, this would save the file)
    let simulatedAvatarPath: AvatarFilePath | undefined = DEFAULT_USER.avatar;
    if (variables.avatar !== undefined) {
      if (variables.avatar === null) {
        // User wants to remove avatar
        simulatedAvatarPath = undefined;
      } else {
        // User uploaded new avatar (base64) - simulate saving as file
        simulatedAvatarPath = createAvatarFilePath(
          "assets/avatar/simulated-test-avatar.png",
        );
      }
    }

    const testUser: User = {
      username: variables.username ?? DEFAULT_USER.username,
      password: variables.password ?? DEFAULT_USER.password,
      avatar: simulatedAvatarPath,
    };
    return {
      success: true,
      user: testUser,
      message: "User updated successfully (test mode)",
    };
  },
  optimisticUpdateFn: (variables: UpdateUserRequest, oldUser: User): User => {
    // Merge partial user updates with current user data
    const updatedUser: User = {
      username: variables.username ?? oldUser.username,
      password: variables.password ?? oldUser.password,
      avatar: oldUser.avatar,
    };

    return updatedUser;
  },
});
updateUserMutationAtom.debugLabel = "updateUserMutationAtom";
